import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Clapperboard,
  Clock,
  History as HistoryIcon,
  ListVideo,
  Menu,
  Move,
  PlayCircle,
  Settings,
  SlidersHorizontal,
  Star,
  Tv,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import heroAsset from "../assets/hero-odisseia.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { usePlaylist } from "../lib/playlist-store";
import { useSettings } from "../lib/settings-store";
import { useTmdbHeroes } from "../lib/use-tmdb";
import type { MediaItem } from "../data/vexia";
import { removeWatch, useContinueWatching } from "../lib/history-store";
import { clearProgress } from "../lib/progress-store";
import { useOpenWatch, useResolvedHistory, WatchCard } from "../components/vexia/WatchCard";
import { DiscoverRows } from "../components/vexia/DiscoverRows";
import type { ResolvedWatch } from "../components/vexia/WatchCard";
import { ConfirmDialog } from "../components/vexia/ConfirmDialog";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Home" },
      {
        name: "description",
        content:
          "Home do VÉXIA TV: destaque em tela cheia com canais, filmes, séries, jogos, listas e ajustes.",
      },
      { property: "og:title", content: "VÉXIA TV — Home" },
      { property: "og:description", content: "Home do VÉXIA TV para Android TV e Smart TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

type Hero = {
  title: string;
  year: number;
  release: string;
  genres: string[];
  runtime: string;
  votes: number;
  stars: number;
  image: string;
  overview: string;
};

const FALLBACK_HERO: Hero = {
  title: "CARREGUE SUA LISTA",
  year: new Date().getFullYear(),
  release: "Menu LISTAS",
  genres: ["CANAIS", "FILMES", "SÉRIES"],
  runtime: "M3U / M3U8",
  votes: 0,
  stars: 0,
  image: heroAsset.url,
  overview:
    "Adicione sua lista M3U pelo menu LISTAS para preencher canais, filmes e séries com capas, sinopses e destaques automáticos.",
};

type Tile = {
  label: string;
  icon: LucideIcon;
  to?: string;
  action?: "lists";
  hideKey?: "hideVod" | "hideSeries";
};

const TILES: Tile[] = [
  { label: "CANAIS", icon: Tv, to: "/canais" },
  { label: "FILMES", icon: PlayCircle, to: "/filmes", hideKey: "hideVod" },
  { label: "SÉRIES", icon: Clapperboard, to: "/series", hideKey: "hideSeries" },
  { label: "FAVORITOS", icon: Heart, to: "/favoritos" },
  { label: "HISTÓRICO", icon: HistoryIcon, to: "/historico" },
  { label: "FILTROS", icon: SlidersHorizontal, to: "/filtros" },
  { label: "LISTAS", icon: ListVideo, action: "lists" },
  { label: "AJUSTES", icon: Settings, to: "/configuracoes" },
];

function HomePage() {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [listsOpen, setListsOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ResolvedWatch | null>(null);
  const { movies, series, channels, hasContent } = usePlaylist();
  const { settings, formatTime } = useSettings();

  // Continuar assistindo: histórico local reconciliado com a lista atual.
  const continueEntries = useContinueWatching(15);
  const continueList = useResolvedHistory(continueEntries);
  const openWatch = useOpenWatch();



  // Blocos visíveis respeitando "Ocultar VOD" e "Ocultar Séries" dos Ajustes.
  const tiles = useMemo(
    () => TILES.filter((t) => !t.hideKey || !settings[t.hideKey]),
    [settings],
  );


  // Pool de destaques: até 8 títulos da lista com imagem disponível.
  const heroPool = useMemo<MediaItem[]>(() => {
    const pool = [...movies, ...series]
      .filter((m) => m.backdrop || m.poster)
      .slice(0, 8);
    return pool;
  }, [movies, series]);

  // Enriquece os destaques com TMDB (nota, sinopse, capas melhores).
  const enrichedHeroes = useTmdbHeroes(heroPool, "movie");

  // Carrossel do destaque: montado a partir dos títulos enriquecidos da lista M3U.
  const slides = useMemo<Hero[]>(() => {
    return enrichedHeroes.map((m) => ({
      title: m.title.toUpperCase(),
      year: m.year,
      release: m.genres[0] ?? "LISTA M3U",
      genres: m.genres.slice(0, 3).map((g) => g.toUpperCase()),
      runtime: m.seasons ? `${m.seasons} TEMPORADAS` : "FILME",
      votes: m.rating,
      stars: Math.round(m.rating),
      image: (m.backdrop || m.poster) as string,
      overview: m.overview ?? "",
    }));
  }, [enrichedHeroes]);

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 8000);
    return () => clearInterval(id);
  }, [slides.length]);

  const HERO = slides[slide % Math.max(1, slides.length)] ?? FALLBACK_HERO;

  // Pré-carrega a próxima imagem para evitar "piscada" na troca de slide.
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(slide + 1) % slides.length];
    if (next?.image) {
      const img = new Image();
      img.src = next.image;
    }
  }, [slide, slides]);

  // Relógio da barra superior.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);

  const focusTile = (i: number) => {
    const next = (i + tiles.length) % tiles.length;
    setActive(next);
    const el = rowRef.current?.querySelectorAll<HTMLElement>("[data-tile]")[next];
    el?.focus();
  };

  // Foco inicial no primeiro bloco (D-pad pronto ao abrir).
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>("[data-tile]")?.focus();
  }, []);

  const openTile = (tile: Tile) => {
    if (tile.action === "lists") setListsOpen(true);
    else if (tile.to) navigate({ to: tile.to });
  };

  return (
    <main className="relative bg-vexia-bg text-vexia-text">
    <section
      className="relative flex h-screen w-full flex-col overflow-hidden"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusTile(active + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusTile(active - 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          if (slides.length > 1) setSlide((s) => (s - 1 + slides.length) % slides.length);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (slides.length > 1) setSlide((s) => (s + 1) % slides.length);
        }
      }}
    >
      {/* Fundo */}
      <div key={HERO.image} className="absolute inset-0 animate-[vexia-fade-in_800ms_ease-out]">
        <img
          src={HERO.image}
          alt={HERO.title}
          className="h-full w-full object-cover animate-[vexia-ken-burns_18s_ease-out_forwards] motion-reduce:animate-none"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/15 to-black/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/45" />

      {/* Topo: logo + informações discretas do título em destaque (vindas da lista) */}
      <header className="relative z-10 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-[3vw] px-[5vw] pt-[3vh]">
        <VexiaLogo className="h-[14vh] max-h-[160px] min-h-[80px] w-auto" />

        <div
          key={`meta-${HERO.title}`}
          className="animate-[vexia-hero-in_400ms_ease-out] text-right"
        >
          <div className="flex items-center justify-end gap-3 text-[clamp(0.6rem,0.8vw,0.8rem)] font-semibold uppercase tracking-[0.14em] text-white/60">
            <Clock className="h-3.5 w-3.5 shrink-0 text-vexia-cyan" aria-hidden />
            <span className="tabular-nums">
              {formatTime(now)}
            </span>
            <span>{now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
          </div>

          <h1 className="mt-[0.8vh] text-[clamp(1.1rem,2.4vw,2.3rem)] font-black leading-[1.05] tracking-tight [text-shadow:0_3px_16px_rgba(0,0,0,0.95)]">
            {HERO.title} <span className="font-light text-white/60">({HERO.year})</span>
          </h1>

          <div className="mt-[0.6vh] flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[clamp(0.55rem,0.78vw,0.8rem)] font-semibold uppercase tracking-[0.1em] text-white/70 [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
            <span>{HERO.release}</span>
            {HERO.genres.map((g) => (
              <span key={g} className="flex items-center gap-2">
                <span className="text-white/25">•</span>
                {g}
              </span>
            ))}
            <span className="text-white/25">•</span>
            <span>{HERO.runtime}</span>
          </div>

          {HERO.stars > 0 ? (
            <div className="mt-[0.6vh] flex items-center justify-end gap-[3px]">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-[clamp(0.6rem,1vw,0.95rem)] w-[clamp(0.6rem,1vw,0.95rem)] shrink-0 ${
                    i < HERO.stars
                      ? "fill-vexia-gold text-vexia-gold"
                      : "fill-white/15 text-white/15"
                  }`}
                  aria-hidden
                />
              ))}
              <span className="ml-1.5 text-[clamp(0.6rem,0.85vw,0.85rem)] font-bold tabular-nums text-white/75">
                {HERO.votes}
              </span>
            </div>
          ) : null}

          {HERO.overview ? (
            <p className="ml-auto mt-[0.9vh] line-clamp-2 max-w-[48ch] text-[clamp(0.6rem,0.82vw,0.85rem)] font-medium leading-snug text-white/60 [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
              {HERO.overview}
            </p>
          ) : null}
        </div>
      </header>

      {/* Meio: imagem do carrossel em destaque (sem sobreposição) */}
      <section className="relative z-10 flex min-h-0 flex-1 items-end justify-end px-[5vw] pb-[1.5vh]">
        {slides.length > 1 ? (
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.title + i}
                type="button"
                aria-label={`Destaque ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-[4px] overflow-hidden rounded-full outline-none transition-all duration-300 ${
                  i === slide
                    ? "w-9 bg-white/25"
                    : "w-3.5 bg-white/25 hover:bg-white/45 focus-visible:bg-vexia-cyan"
                }`}
              >
                {i === slide ? (
                  <span
                    key={`p-${slide}`}
                    className="block h-full animate-[vexia-slide-progress_8s_linear_forwards] rounded-full bg-vexia-cyan shadow-[0_0_10px_var(--vexia-cyan)]"
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : !hasContent ? (
          <p className="text-[clamp(0.6rem,0.85vw,0.85rem)] font-semibold uppercase tracking-[0.12em] text-vexia-cyan/80">
            Abra LISTAS e carregue sua lista M3U
          </p>
        ) : null}
      </section>

      {/* Continuar assistindo (histórico local) */}
      {continueList.length > 0 ? (
        <section className="relative z-10 shrink-0 px-[5vw] pb-[1.2vh]">
          <h2 className="mb-[0.8vh] text-[clamp(0.6rem,0.85vw,0.85rem)] font-black uppercase tracking-[0.2em] text-vexia-purple-soft drop-shadow-[0_0_14px_rgba(123,47,190,0.7)]">
            Continuar assistindo
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {continueList.map((entry) => (
              <WatchCard
                key={entry.key}
                entry={entry}
                compact
                onOpen={() => openWatch(entry)}
                onRemove={() => setPendingRemove(entry)}
              />
            ))}
          </div>
        </section>
      ) : null}




      {/* Menu de blocos */}
      <nav
        ref={rowRef}
        className="relative z-10 grid shrink-0 gap-[1.1vw] px-[5vw]"
        style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
      >
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          const isActive = i === active;
          return (
            <button
              key={tile.label}
              data-tile
              type="button"
              tabIndex={0}
              onFocus={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onClick={() => openTile(tile)}
              className={`group relative flex aspect-[5/4] max-h-[15vh] w-full flex-col items-center justify-center gap-[1vh] overflow-hidden rounded-2xl border outline-none backdrop-blur-md transition-all duration-200 ease-out ${
                isActive
                  ? "-translate-y-[0.6vh] scale-[1.04] border-vexia-cyan/90 bg-gradient-to-b from-[#7B2FBE]/95 via-[#3a0f78]/95 to-[#1a0638]/95 shadow-[0_22px_55px_-12px_rgba(123,47,190,0.55),0_0_30px_-6px_rgba(0,200,255,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "border-white/15 bg-gradient-to-b from-white/[0.09] via-[#241A6B]/55 to-[#0a0420]/75 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(255,255,255,0.05)] hover:border-vexia-cyan/50 hover:from-white/[0.12] hover:via-[#2c208a]/65 hover:to-[#0d0528]/80"
              }`}
            >
              {/* reflexo espelhado superior */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-[35%] -skew-y-1 bg-gradient-to-b from-white/35 via-white/10 to-transparent transition-opacity ${
                  isActive ? "opacity-90" : "opacity-60 group-hover:opacity-80"
                }`}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity ${
                  isActive ? "bg-white/90" : "bg-white/35"
                }`}
              />
              <Icon
                className={`relative z-10 h-[clamp(1.5rem,3.4vh,2.6rem)] w-auto shrink-0 transition-all duration-200 ${
                  isActive
                    ? "scale-110 stroke-[2] text-white drop-shadow-[0_0_12px_var(--vexia-cyan)]"
                    : "stroke-[1.8] text-vexia-cyan/90 drop-shadow-[0_0_6px_rgba(0,200,255,0.35)]"
                }`}
                aria-hidden
              />
              <span
                className={`relative z-10 text-[clamp(0.62rem,0.95vw,1rem)] font-bold uppercase leading-none tracking-[0.14em] transition-colors ${
                  isActive
                    ? "text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.9),0_0_8px_rgba(255,255,255,0.3)]"
                    : "text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.85)]"
                }`}
              >
                {tile.label}
              </span>
              <span
                aria-hidden
                className={`pointer-events-none absolute bottom-1 h-[3px] rounded-full bg-gradient-to-r from-transparent via-vexia-cyan to-transparent transition-all duration-200 ${
                  isActive ? "w-3/4 opacity-100 shadow-[0_0_14px_var(--vexia-cyan)]" : "w-0 opacity-0"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Rodapé de ajuda */}
      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-center gap-x-7 gap-y-2 px-[5vw] py-[2.5vh] text-[clamp(0.65rem,0.95vw,0.95rem)] font-semibold text-white/85">
        <span className="flex items-center gap-2">
          <Move className="h-4 w-4 shrink-0 text-vexia-cyan" aria-hidden /> Navegar
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-current px-2 py-0.5 text-[0.7em] font-bold">
            ↑ ↓
          </span>
          Trocar destaque
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-current px-2 py-0.5 text-[0.7em] font-bold">
            OK
          </span>
          Selecionar
        </span>
        <Link
          to="/configuracoes"
          className="flex items-center gap-2 outline-none focus-visible:text-vexia-cyan"
        >
          <Menu className="h-4 w-4 shrink-0" aria-hidden /> Menu
        </Link>
      </footer>

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remover de Continuar assistindo?"
        message={
          pendingRemove
            ? `"${pendingRemove.name}" sairá da lista e o progresso salvo será apagado.`
            : undefined
        }
        onConfirm={() => {
          const entry = pendingRemove;
          if (!entry) return;
          removeWatch(entry.key);
          clearProgress(entry.liveId ?? entry.id);
          if (entry.episodeId) clearProgress(`${entry.liveId ?? entry.id}::${entry.episodeId}`);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </section>

      {/* Carrosséis premium de descoberta (M3U + TMDB) */}
      <DiscoverRows />
    </main>
  );
}
