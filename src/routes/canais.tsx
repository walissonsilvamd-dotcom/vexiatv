import { setStreamHandoff } from "../lib/stream-handoff";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Play, Search, SlidersHorizontal, Tv } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";
import type { PlaylistChannel } from "../lib/m3u";
import { channelFavorite, useFavorites } from "../lib/favorites-store";
import { matchesChannel, sortChannels, useFilters, useSort } from "../lib/filters-store";
import { SortControl } from "../components/vexia/SortControl";
import { useDebounce } from "../hooks/useDebounce";
import { buildSearchIndex, queryIndex } from "../utils/search-index";
import { VirtualizedList } from "../components/VirtualizedGrid";
import { SmartImage } from "../components/vexia/SmartImage";


export const Route = createFileRoute("/canais")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Canais ao vivo" },
      {
        name: "description",
        content:
          "Canais ao vivo da sua lista M3U/HLS com categorias automáticas, prévia e favoritos.",
      },
      { property: "og:title", content: "VÉXIA TV — Canais" },
      { property: "og:description", content: "Canais ao vivo organizados por categoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelsPage,
});

const PAGE = 50;

/** Extrai a qualidade anunciada no nome do canal (FHD, HD, SD, 4K, 1080p...). */
function qualityOf(name: string) {
  const m = name.match(/\b(4K|UHD|FHD|HD|SD|H265|1080p|720p|480p)\b/i);
  return m ? m[1].toUpperCase() : "";
}

function ChannelsPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const navigate = useNavigate();
  const { channels, data, hasContent } = usePlaylist();
  const { has, toggle } = useFavorites();

  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlaylistChannel | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);

  const favs = useMemo(
    () => channels.filter((c) => has("channel", c.name)).map((c) => c.id),
    [channels, has],
  );

  const toggleFav = useCallback(
    (ch: PlaylistChannel) => toggle(channelFavorite(ch)),
    [toggle],
  );

  // Categorias 100% dinâmicas: vêm sempre do group-title da lista carregada.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of channels) map.set(ch.category, (map.get(ch.category) ?? 0) + 1);
    return map;
  }, [channels]);

  const categories = data?.channelCategories ?? ["Todos"];
  const { filters, active: activeFilters } = useFilters();
  const { sort } = useSort();

  const index = useMemo(
    () =>
      buildSearchIndex(channels, {
        id: (c) => c.id,
        name: (c) => c.name,
        category: (c) => c.category,
        genre: (c) => c.group,
      }),
    [channels],
  );
  const debouncedQuery = useDebounce(query, 250);

  const list = useMemo(() => {
    const searched = debouncedQuery.trim() ? queryIndex(index, debouncedQuery) : channels;
    const base = searched.filter(
      (c) =>
        (category === "Todos" ||
          (category === "Favoritos" ? favs.includes(c.id) : c.category === category)) &&
        matchesChannel(c.name, c.category, filters),
    );
    return sortChannels(base, sort);
  }, [channels, index, debouncedQuery, category, favs, filters, sort]);


  useEffect(() => {
    setSelected((cur) => (cur && list.some((c) => c.id === cur.id) ? cur : (list[0] ?? null)));
  }, [list]);

  const shell = (children: React.ReactNode) => (
    <main
      ref={scopeRef}
      className="vexia-safe relative min-h-screen bg-vexia-bg text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,5,0.86), rgba(5,5,5,0.94)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex flex-wrap items-center gap-3 px-6 py-4 md:px-10">
        <TopNav active="Canais" />
        <label className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            data-nav-row={0}
            tabIndex={0}
            placeholder="Buscar canal, categoria ou grupo"
            aria-label="Buscar canais"
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2.5 pl-11 pr-4 text-sm text-vexia-text outline-none backdrop-blur-xl placeholder:text-vexia-text/45"
          />
        </label>
        <SortControl navRow={0} labels={{ nota: "Ordem da lista", recentes: "Mais recentes" }} />
        <Link
          to="/filtros"
          data-nav-row={0}
          tabIndex={0}
          aria-label="Abrir filtros"
          className="vexia-focus flex items-center gap-2 rounded-full border border-vexia-cyan/40 bg-black/60 px-4 py-2.5 text-[11px] font-bold text-vexia-cyan backdrop-blur-xl"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          FILTROS
          {activeFilters > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-vexia-purple px-1 text-[10px] font-black text-white">
              {activeFilters}
            </span>
          ) : null}
        </Link>
        <div className="ml-auto hidden md:block">
          <VexiaLogo className="h-11" />
        </div>
      </header>

      {children}
      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
  );

  if (!hasContent || channels.length === 0) {
    return shell(
      <div className="px-6 md:px-10">
        <EmptyPlaylist section="Os canais ao vivo" onOpenLists={() => setListsOpen(true)} />
      </div>,
    );
  }

  const visible = list.slice(0, limit);
  /* Listas grandes: apenas as linhas visíveis são montadas. */
  const useVirtual = list.length > 120;

  const renderChannel = (ch: PlaylistChannel, i: number) => {
    const isActive = selected?.id === ch.id;
    const quality = qualityOf(ch.name);
    return (
      <div className="group relative mb-1.5">
        <button
          type="button"
          data-nav-row={2}
          tabIndex={0}
          onClick={() => setSelected(ch)}
          className={`vexia-focus flex w-full items-center gap-3 rounded-xl border py-2.5 pl-3 pr-11 text-left transition-all duration-200 ${
            isActive
              ? "scale-[1.02] border-vexia-purple/70 bg-gradient-to-r from-vexia-purple to-vexia-purple/60 shadow-[0_0_22px_-6px_rgba(0,200,255,0.6)]"
              : "border-white/5 bg-vexia-card hover:border-vexia-purple/40"
          }`}
        >
          <span
            className={`w-7 shrink-0 text-right text-xs font-bold ${isActive ? "text-white" : "text-vexia-muted"}`}
          >
            {i + 1}
          </span>
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/70">
            {ch.logo ? (
              <SmartImage
                src={ch.logo}
                role="logo"
                alt=""
                className="h-full w-full object-contain p-0.5"
                fallback={<Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />}
              />
            ) : (
              <Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-vexia-text">{ch.name}</span>
            <span
              className={`block truncate text-[11px] font-medium ${isActive ? "text-white/80" : "text-vexia-cyan/80"}`}
            >
              {ch.group}
              {quality ? ` • ${quality}` : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleFav(ch)}
          aria-label={favs.includes(ch.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className={`absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border transition-all ${
            favs.includes(ch.id)
              ? "border-vexia-purple/60 bg-vexia-purple shadow-[0_0_14px_rgba(123,47,190,0.7)]"
              : "border-vexia-cyan/40 bg-black/50 hover:border-vexia-cyan"
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${favs.includes(ch.id) ? "fill-current text-vexia-text" : "text-vexia-cyan"}`}
            aria-hidden
          />
        </button>
      </div>
    );
  };


  return shell(
    <div className="grid gap-4 px-4 pb-10 md:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.1fr)] md:px-8">
      {/* Coluna 1 — categorias dinâmicas */}
      <aside className="no-scrollbar max-h-[78vh] space-y-1.5 overflow-y-auto pr-1">
        <h1 className="px-3 py-2 text-sm font-black tracking-[0.2em] text-vexia-text">CANAIS</h1>
        {["Favoritos", ...categories].map((cat) => {
          const total = cat === "Todos" ? channels.length : cat === "Favoritos" ? favs.length : (counts.get(cat) ?? 0);
          const isActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              data-nav-row={1}
              tabIndex={0}
              onClick={() => {
                setCategory(cat);
                setLimit(PAGE);
              }}
              className={`vexia-focus flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                isActive
                  ? "border-vexia-purple/60 bg-gradient-to-r from-vexia-purple to-vexia-purple/70 text-white shadow-[0_0_18px_-4px_rgba(123,47,190,0.85),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "border-white/10 bg-vexia-card text-vexia-text hover:border-vexia-purple/40"
              }`}
            >
              <Tv className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{cat.toUpperCase()}</span>
              <span className={`text-[11px] ${isActive ? "text-white/80" : "text-vexia-muted"}`}>
                {total}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Coluna 2 — lista de canais */}
      <section
        className={`border-x border-white/5 px-2 ${useVirtual ? "" : "no-scrollbar max-h-[78vh] overflow-y-auto"}`}
      >
        {useVirtual ? (
          <VirtualizedList
            items={list}
            height="78vh"
            className="no-scrollbar"
            keyFor={(ch) => ch.id}
            renderItem={(ch, i) => renderChannel(ch, i)}
          />
        ) : (
          <>
            {visible.map((ch, i) => (
              <div key={ch.id}>{renderChannel(ch, i)}</div>
            ))}

            {limit < list.length ? (
              <button
                type="button"
                data-nav-row={3}
                tabIndex={0}
                onClick={() => setLimit((l) => l + PAGE)}
                className="vexia-focus mt-2 w-full rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_26px_-12px_rgba(123,47,190,0.9)]"
              >
                Carregar mais canais
              </button>
            ) : null}
          </>
        )}

        {list.length === 0 ? (
          <p className="px-3 py-6 text-sm text-vexia-muted">Nenhum canal encontrado.</p>
        ) : null}
      </section>


      {/* Coluna 3 — prévia do canal */}
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-vexia-purple/50 bg-black shadow-[0_16px_44px_-18px_rgba(0,200,255,0.5)]">
          <div className="grid aspect-video w-full place-items-center bg-black">
            {selected?.logo ? (
              <SmartImage
                src={selected.logo}
                role="logo"
                alt={selected.name}
                eager
                preview={false}
                className="max-h-[55%] max-w-[45%] object-contain drop-shadow-[0_0_22px_rgba(0,200,255,0.35)]"
                fallback={<span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>}
              />
            ) : (
              <span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-vexia-text">{selected?.name ?? "—"}</h2>
          <p className="mt-1 text-sm font-medium text-vexia-cyan">
            {[qualityOf(selected?.name ?? "") || "SD", "Ao vivo", selected?.category]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => {
              if (!selected) return;
              setStreamHandoff("live", selected.id, selected.url);
              void navigate({ to: "/player", search: { type: "live", id: selected.id } });
            }}
            className="vexia-focus inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-6 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_26px_-12px_rgba(123,47,190,0.9)]"
          >
            <Play className="h-4 w-4" aria-hidden /> Assistir
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => selected && toggleFav(selected)}
            className="vexia-focus rounded-xl border border-vexia-cyan/40 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            {selected && favs.includes(selected.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="Buscar canais"]')?.focus()}
            className="vexia-focus rounded-xl border border-white/10 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            Procurar
          </button>
        </div>
      </section>
    </div>,
  );
}
