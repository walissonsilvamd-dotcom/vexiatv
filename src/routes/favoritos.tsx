import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { Heart, HeartOff, Search, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";
import { matchFavorite, useFavorites, type Favorite, type FavoriteKind } from "../lib/favorites-store";
import { SmartImage } from "../components/vexia/SmartImage";
import { PosterArt } from "../components/vexia/PosterArt";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Favoritos" },
      {
        name: "description",
        content:
          "Seus canais, filmes e séries favoritos do VÉXIA TV salvos no aparelho e sempre à mão.",
      },
      { property: "og:title", content: "VÉXIA TV — Favoritos" },
      {
        property: "og:description",
        content: "Acesso rápido aos conteúdos que você marcou com o coração.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/favoritos" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/favoritos" }],
  }),
  component: FavoritesPage,
});

const FILTERS: { label: string; kind: FavoriteKind | "all" }[] = [
  { label: "Todos", kind: "all" },
  { label: "Canais", kind: "channel" },
  { label: "Filmes", kind: "movie" },
  { label: "Séries", kind: "series" },
];

function FavoriteCard({
  fav,
  navRow,
  onOpen,
  onRemove,
}: {
  fav: Favorite & { liveLogo?: string };
  navRow: number;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const logo = fav.liveLogo || fav.logo;
  const isChannel = fav.kind === "channel";

  return (
    <div className="group relative">
      <button
        type="button"
        data-nav-row={navRow}
        tabIndex={0}
        onClick={onOpen}
        className="vexia-card-focus block w-full overflow-hidden rounded-lg border border-white/10 bg-[#1A1A1A] text-left transition-all duration-300 hover:border-vexia-purple hover:shadow-[0_0_26px_rgb(var(--vexia-secondary-rgb)/0.25)]"
      >
        <div
          className={`relative w-full overflow-hidden ${isChannel ? "aspect-video" : "aspect-[2/3]"}`}
        >
          {logo && !broken ? (
            <SmartImage
              src={logo}
              role={isChannel ? "logo" : "poster"}
              alt={fav.name}
              className={`h-full w-full ${isChannel ? "object-contain p-4" : "object-cover"} transition-transform duration-500 group-hover:scale-105`}
            />
          ) : (
            <PosterArt title={fav.name} kind={isChannel ? "live" : "movie"} compact={isChannel} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {fav.rating && fav.rating > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] font-black text-vexia-gold backdrop-blur-md">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {fav.rating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <div className="space-y-0.5 border-t border-white/5 p-2.5">
          <p className="truncate text-xs font-extrabold text-vexia-text">{fav.name}</p>
          <p className="truncate text-[11px] font-medium text-vexia-cyan">
            {fav.category || (isChannel ? "Canal" : fav.kind === "movie" ? "Filme" : "Série")}
            {fav.year ? ` • ${fav.year}` : ""}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover dos favoritos"
        className="absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full border border-vexia-purple/60 bg-vexia-purple/80 shadow-[0_0_14px_rgb(var(--vexia-primary-rgb)/0.7)] backdrop-blur-md transition-all hover:scale-105"
      >
        <Heart className="h-3.5 w-3.5 fill-current text-white" aria-hidden />
      </button>
    </div>
  );
}

function FavoritesPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const navigate = useNavigate();
  const { favorites, remove } = useFavorites();
  const { channels, movies, series } = usePlaylist();

  const [filter, setFilter] = useState<FavoriteKind | "all">("all");
  const [query, setQuery] = useState("");

  /** Reconcilia os favoritos salvos com a lista atual (id → url → nome). */
  const resolved = useMemo(() => {
    return favorites
      .slice()
      .sort((a, b) => b.addedAt - a.addedAt)
      .map((fav) => {
        const pool =
          fav.kind === "channel" ? channels : fav.kind === "movie" ? movies : series;
        const live = matchFavorite(fav, pool as never);
        const liveAny = live as
          | { id: string; logo?: string; poster?: string; url?: string; streamUrl?: string }
          | undefined;
        return {
          ...fav,
          liveId: liveAny?.id,
          liveLogo: liveAny?.logo ?? liveAny?.poster,
          liveUrl: liveAny?.url ?? liveAny?.streamUrl,
        };
      });
  }, [favorites, channels, movies, series]);

  const counts = useMemo(
    () => ({
      all: resolved.length,
      channel: resolved.filter((f) => f.kind === "channel").length,
      movie: resolved.filter((f) => f.kind === "movie").length,
      series: resolved.filter((f) => f.kind === "series").length,
    }),
    [resolved],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resolved.filter(
      (f) =>
        (filter === "all" || f.kind === filter) &&
        (!q || f.name.toLowerCase().includes(q) || (f.category ?? "").toLowerCase().includes(q)),
    );
  }, [resolved, filter, query]);

  const open = (fav: (typeof resolved)[number]) => {
    const id = fav.liveId ?? fav.id;
    if (fav.kind === "channel") {
      if (!fav.liveId) return;
      void navigate({ to: "/player", search: { type: "live", id } });
      return;
    }
    void navigate({
      to: "/detalhes/$id",
      params: { id },
    });
  };

  return (
    <main
      ref={scopeRef}
      className="vexia-safe relative min-h-screen bg-vexia-bg pb-14 text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,5,0.88), rgba(5,5,5,0.95)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex items-center gap-4 px-6 py-4 md:px-10">
        <TopNav active="Favoritos" />
        <label className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-nav-row={0}
            tabIndex={0}
            placeholder="Buscar nos favoritos"
            aria-label="Buscar nos favoritos"
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2.5 pl-11 pr-4 text-sm text-vexia-text outline-none backdrop-blur-xl placeholder:text-vexia-text/45"
          />
        </label>
        <div className="ml-auto hidden md:block">
          <VexiaLogo className="h-11" />
        </div>
      </header>

      <h1 className="px-6 text-2xl font-black tracking-wide text-vexia-purple-soft drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.6)] md:px-10 md:text-3xl">
        FAVORITOS
      </h1>

      <div className="mt-4 flex flex-col gap-6 px-6 md:flex-row md:px-10">
        {/* ─── Categorias ─── */}
        <aside className="w-full shrink-0 md:w-56">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-vexia-text/50">
            Categorias
          </p>
          <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {FILTERS.map((f) => {
              const isActive = filter === f.kind;
              return (
                <button
                  key={f.kind}
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onClick={() => setFilter(f.kind)}
                  className={`vexia-focus flex shrink-0 items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-vexia-purple text-white shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.55)]"
                      : "bg-[#1A1A1A] text-vexia-text hover:bg-white/10"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={isActive ? "text-white/80" : "text-vexia-cyan"}>
                    {counts[f.kind]}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Grade ─── */}
        <section className="min-w-0 flex-1">
          {list.length ? (
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-7">
              {list.map((fav) => (
                <FavoriteCard
                  key={fav.key}
                  fav={fav}
                  navRow={2}
                  onOpen={() => open(fav)}
                  onRemove={() => remove(fav.key)}
                />
              ))}
            </div>
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-2xl border border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
              <div className="space-y-3">
                <HeartOff className="mx-auto h-10 w-10 text-vexia-cyan/70" aria-hidden />
                <p className="text-lg font-black text-vexia-text">Nenhum favorito ainda</p>
                <p className="text-sm text-vexia-text/60">
                  Adicione clicando no coração em qualquer conteúdo
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
