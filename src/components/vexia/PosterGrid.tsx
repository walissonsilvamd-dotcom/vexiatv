import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { preloadImages } from "../../lib/image";
import type { MediaItem } from "../../data/vexia";
import { useTmdbItem } from "../../lib/use-tmdb";
import { mediaFavorite, useFavorites } from "../../lib/favorites-store";
import { SmartImage } from "./SmartImage";
import { PosterArt } from "./PosterArt";
import { AudioTagBadge } from "./AudioTagBadge";


function PosterCardBase({
  item,
  navRow,
  progress,
  kind = "movie",
  priority = false,
}: {
  item: MediaItem;
  navRow: number;
  progress?: number;
  kind?: "movie" | "series";
  /** Card acima da dobra: baixa a capa imediatamente e com prioridade alta. */
  priority?: boolean;
}) {
  const { has, toggle } = useFavorites();
  const fav = has(kind, item.title);
  const [broken, setBroken] = useState(false);
  // Se a capa da lista falhar, buscamos capa e nota no TMDB.
  const { data: display } = useTmdbItem(item, kind, "card", broken);
  const active = display ?? item;
  // Se o pôster falhar, tenta o backdrop antes de cair no placeholder
  // Capa da lista quebrada → usa a do TMDB (quando chegar) ou o backdrop.
  const tmdbPoster = display && display.poster !== item.poster ? display.poster : undefined;
  const image = broken ? tmdbPoster || active.backdrop : active.poster || active.backdrop;
  const showPoster = !!image;

  return (
    <div className="group relative">
      <Link
        to="/detalhes/$id"
        params={{ id: active.id }}
        data-nav-row={navRow}
        tabIndex={0}
        className="vexia-card-focus block scroll-m-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#101010] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-vexia-purple/50 hover:shadow-[0_14px_34px_-10px_rgb(var(--vexia-primary-rgb)/0.45)] focus:border-vexia-cyan/60 focus:shadow-[0_0_30px_rgb(var(--vexia-secondary-rgb)/0.25)]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {showPoster ? (
            <SmartImage
              src={image}
              role="poster"
              alt={active.title}
              objectPosition={active.posterPosition ?? "center"}
              key={image}
              eager={priority}
              onFail={() => setBroken(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              fallback={<PosterArt title={active.title} kind={kind} />}
            />
          ) : (
            <PosterArt title={active.title} kind={kind} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/20" />
          {/* brilho espelhado */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-vexia-purple/25 via-transparent to-transparent" />
          {/* Nota — sempre visível no canto superior direito */}
          <span
            className={`absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-black backdrop-blur-md ${
              active.rating > 0
                ? "border-vexia-gold/40 bg-black/75 text-vexia-gold shadow-[0_0_12px_rgba(0,0,0,0.7)]"
                : "border-white/15 bg-black/65 text-white/55"
            }`}
          >
            <Star className="h-3 w-3 fill-current" aria-hidden />
            {active.rating > 0 ? active.rating.toFixed(1) : "—"}
          </span>
          {/* Selo DUBL / LEG — evita entrar no título para descobrir o áudio */}
          <AudioTagBadge
            sources={[item.title, active.title, item.category]}
            className="absolute left-1.5 top-1.5 bg-black/75"
          />

          {progress != null ? (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10">

              <div
                className="h-full bg-gradient-to-r from-vexia-purple to-vexia-cyan shadow-[0_0_10px_rgb(var(--vexia-primary-rgb)/0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="space-y-0.5 border-t border-white/5 p-2.5">
          <p className="truncate text-xs font-extrabold text-vexia-text">{active.title}</p>
          <p className="truncate text-[11px] font-medium text-vexia-cyan/80">
            {active.year ? active.year : active.genres[0]}
            {active.seasons ? ` • ${active.seasons} temp.` : ""}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(mediaFavorite({ ...item, poster: active.poster, rating: active.rating, year: active.year }, kind))}
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={`absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition-all ${
          fav
            ? "border-vexia-purple/60 bg-vexia-purple/80 shadow-[0_0_14px_rgb(var(--vexia-primary-rgb)/0.7)]"
            : "border-white/15 bg-black/60 hover:border-vexia-cyan/60"
        }`}
      >
        <Heart
          className={`h-3.5 w-3.5 ${fav ? "fill-current text-white" : "text-vexia-cyan"}`}
          aria-hidden
        />
      </button>
    </div>
  );
}


/** Memo: em grades grandes evita re-render de todos os cards na TV. */
export const PosterCard = memo(
  PosterCardBase,
  (a, b) =>
    a.item.id === b.item.id &&
    a.item.poster === b.item.poster &&
    a.item.rating === b.item.rating &&
    a.navRow === b.navRow &&
    a.kind === b.kind &&
    a.progress === b.progress,
);

export function PosterGrid({
  items,
  navRow,
  progressMap,
  kind = "movie",
}: {
  items: MediaItem[];
  navRow: number;
  progressMap?: Record<string, number>;
  kind?: "movie" | "series";
}) {
  // Pré-carrega as capas desta página no cache persistente: rolar fica
  // instantâneo e a qualidade continua sendo a máxima da tela. Usamos tempo
  // ocioso para não competir com a animação de troca de página no D-pad.
  useEffect(() => {
    if (!items.length) return;
    const run = () => preloadImages(items.map((item) => item.poster || item.backdrop), "poster");
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (idle) {
      const handle = idle(run, { timeout: 500 });
      return () => (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(handle);
    }
    const id = setTimeout(run, 200);
    return () => clearTimeout(id);
  }, [items]);

  return (
    <div
      className="grid grid-cols-3 gap-3 md:grid-cols-6 lg:grid-cols-8"
      style={{ contain: "layout paint style" }}
    >


      {items.map((item) => (
        <PosterCard
          key={item.id}
          item={item}
          navRow={navRow}
          kind={kind}
          progress={progressMap?.[item.id]}
        />
      ))}
    </div>
  );
}

export function LoadMore({
  label,
  navRow,
  onClick,
}: {
  label: string;
  navRow: number;
  onClick?: () => void;
}) {
  return (
    <div className="flex justify-center py-6">
      <button
        type="button"
        data-nav-row={navRow}
        tabIndex={0}
        onClick={onClick}
        className="vexia-focus rounded-full border border-white/10 bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-9 py-3 text-xs font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_28px_-10px_rgb(var(--vexia-primary-rgb)/0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-8px_rgb(var(--vexia-primary-rgb)/1)]"
      >
        {label}
      </button>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black tracking-wide text-vexia-purple-soft md:text-xl">
      {children}
    </h2>
  );
}
