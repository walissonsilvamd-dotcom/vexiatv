import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Clapperboard,
  Clock,
  Film,
  Gamepad2,
  ListVideo,
  Menu,
  Move,
  PlayCircle,
  RefreshCw,
  Settings,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import heroAsset from "../assets/hero-odisseia.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { usePlaylist } from "../lib/playlist-store";

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
};

type Tile = { label: string; icon: LucideIcon; to?: string; action?: "reload" | "lists" };

const TILES: Tile[] = [
  { label: "CANAIS", icon: Tv, to: "/canais" },
  { label: "FILMES", icon: PlayCircle, to: "/filmes" },
  { label: "SÉRIES", icon: Clapperboard, to: "/series" },
  { label: "JOGOS", icon: Gamepad2, to: "/filtros" },
  { label: "LISTAS", icon: ListVideo, action: "lists" },
  { label: "AJUSTES", icon: Settings, to: "/configuracoes" },
  { label: "ATUALIZAR", icon: RefreshCw, action: "reload" },
];

function HomePage() {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [listsOpen, setListsOpen] = useState(false);
  const { movies, series, channels, hasContent } = usePlaylist();

  // Carrossel do destaque: montado a partir dos títulos da lista M3U carregada.
  const slides = useMemo<Hero[]>(() => {
    const pool = [...movies, ...series]
      .map((m) => ({ m, image: m.backdrop || m.poster }))
      .filter((x) => !!x.image)
      .slice(0, 40);
    const step = Math.max(1, Math.floor(pool.length / 8));
    const picked = pool.filter((_, i) => i % step === 0).slice(0, 8);
    return (picked.length ? picked : pool.slice(0, 8)).map(({ m, image }) => ({
      title: m.title.toUpperCase(),
      year: m.year,
      release: m.genres[0] ?? "LISTA M3U",
      genres: m.genres.slice(0, 3).map((g) => g.toUpperCase()),
      runtime: m.seasons ? `${m.seasons} TEMPORADAS` : "FILME",
      votes: m.rating,
      stars: Math.round(m.rating),
      image: image as string,
    }));
  }, [movies, series]);

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 8000);
    return () => clearInterval(id);
  }, [slides.length]);

  const HERO = slides[slide % Math.max(1, slides.length)] ?? FALLBACK_HERO;

  const focusTile = (i: number) => {
    const next = (i + TILES.length) % TILES.length;
    setActive(next);
    const el = rowRef.current?.querySelectorAll<HTMLElement>("[data-tile]")[next];
    el?.focus();
  };

  const openTile = (tile: Tile) => {
    if (tile.action === "reload") window.location.reload();
    else if (tile.action === "lists") setListsOpen(true);
    else if (tile.to) navigate({ to: tile.to });
  };

  return (
    <main
      className="relative h-screen w-full overflow-hidden bg-vexia-bg text-vexia-text"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusTile(active + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusTile(active - 1);
        }
      }}
    >
      <img
        key={HERO.image}
        src={HERO.image}
        alt={HERO.title}
        className="absolute inset-0 h-full w-full object-cover animate-[vexia-fade-in_700ms_ease-out]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

      {/* Logo */}
      <div className="absolute left-[6%] top-[6%] z-10">
        <VexiaLogo className="h-[22vh] min-h-[120px]" />
      </div>

      {/* Título e metadados */}
      <div className="absolute right-[3%] top-[10%] z-10 max-w-[62%] text-right">
        <h1 className="text-[clamp(2rem,5vw,4.5rem)] font-black leading-none tracking-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
          {HERO.title} <span className="font-black">({HERO.year})</span>
        </h1>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[clamp(0.65rem,1.1vw,1rem)] font-semibold tracking-wide">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-vexia-gold" aria-hidden />
            {HERO.release}
          </span>
          <span className="text-vexia-muted">|</span>
          {HERO.genres.map((g) => (
            <span key={g} className="flex items-center gap-1.5">
              <Film className="h-4 w-4 text-vexia-cyan" aria-hidden />
              {g}
            </span>
          ))}
          <span className="text-vexia-muted">|</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-vexia-cyan" aria-hidden />
            {HERO.runtime}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <Star
              key={i}
              className={`h-[clamp(1rem,2vw,1.9rem)] w-[clamp(1rem,2vw,1.9rem)] ${
                i < HERO.stars ? "fill-vexia-gold text-vexia-gold" : "fill-vexia-muted/60 text-vexia-muted/60"
              }`}
              aria-hidden
            />
          ))}
          <span className="ml-1 text-[clamp(0.9rem,1.8vw,1.7rem)] font-bold">({HERO.votes})</span>
        </div>

        <p className="mt-3 text-[clamp(0.6rem,0.9vw,0.9rem)] font-semibold tracking-wide text-vexia-cyan">
          {hasContent
            ? `${channels.length} canais · ${movies.length} filmes · ${series.length} séries na sua lista`
            : "Abra LISTAS e carregue sua lista M3U para preencher o app"}
        </p>
      </div>

      {/* Menu de blocos */}
      <div
        ref={rowRef}
        className="absolute bottom-[11%] left-[6%] right-[6%] z-10 flex flex-wrap items-end gap-[1.2vw]"
      >
        {TILES.map((tile, i) => {
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
              className={`group relative flex h-[14vh] min-h-[118px] w-[10.5vw] min-w-[118px] flex-col items-center justify-center gap-[1.2vh] overflow-hidden rounded-2xl border outline-none backdrop-blur-md transition-all duration-200 ease-out ${
                isActive
                  ? "-translate-y-[0.6vh] scale-[1.06] border-vexia-cyan/70 bg-gradient-to-b from-vexia-purple to-[#3a0f78] shadow-[0_18px_46px_-10px_var(--vexia-purple),0_0_26px_-6px_var(--vexia-cyan)]"
                  : "border-white/10 bg-gradient-to-b from-[#241A6B]/70 to-[#120b38]/80 hover:border-vexia-cyan/40 hover:from-[#2c208a]/80"
              }`}
            >
              {/* brilho superior */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity ${
                  isActive ? "bg-vexia-cyan opacity-90" : "bg-white/25 opacity-60"
                }`}
              />
              <Icon
                className={`h-[4.6vh] min-h-10 w-auto transition-all duration-200 ${
                  isActive
                    ? "scale-110 stroke-[2] text-white drop-shadow-[0_0_10px_var(--vexia-cyan)]"
                    : "stroke-[1.8] text-vexia-cyan/90"
                }`}
                aria-hidden
              />
              <span
                className={`text-[clamp(0.72rem,1.05vw,1.05rem)] font-bold uppercase leading-none tracking-[0.14em] transition-colors ${
                  isActive
                    ? "text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]"
                    : "text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]"
                }`}
              >
                {tile.label}
              </span>
              {/* barra de foco */}
              <span
                aria-hidden
                className={`pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-vexia-cyan transition-all duration-200 ${
                  isActive ? "w-2/3 opacity-100 shadow-[0_0_12px_var(--vexia-cyan)]" : "w-0 opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Rodapé de ajuda */}
      <div className="absolute inset-x-0 bottom-[4%] z-10 flex items-center justify-center gap-8 text-[clamp(0.7rem,1vw,1rem)] text-vexia-text/90">
        <span className="flex items-center gap-2">
          <Move className="h-4 w-4" aria-hidden /> Navegar
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-current px-2 py-0.5 text-[0.7em] font-bold">OK</span>
          Selecionar
        </span>
        <Link
          to="/configuracoes"
          className="flex items-center gap-2 outline-none focus-visible:text-vexia-cyan"
        >
          <Menu className="h-4 w-4" aria-hidden /> Menu
        </Link>
      </div>

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
  );
}
