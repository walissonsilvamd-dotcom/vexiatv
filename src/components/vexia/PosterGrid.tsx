import { Link } from "@tanstack/react-router";
import { Heart, ImageOff, Star } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "../../data/vexia";
import { useTmdbItem } from "../../lib/use-tmdb";
import { mediaFavorite, useFavorites } from "../../lib/favorites-store";

export function PosterCard({
  item,
  navRow,
  progress,
  kind = "movie",
}: {
  item: MediaItem;
  navRow: number;
  progress?: number;
  kind?: "movie" | "series";
}) {
  const { has, toggle } = useFavorites();
  const fav = has(kind, item.title);
  const [broken, setBroken] = useState(false);
  const { data: display } = useTmdbItem(item, kind);
  const active = display ?? item;
  const showPoster = !!active.poster && !broken;

  return (
    <div className="group relative">
      <Link
        to={kind === "series" ? "/serie/$id" : "/detalhes/$id"}
        params={{ id: active.id }}
        data-nav-row={navRow}
        tabIndex={0}
        className="vexia-focus block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#101010] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-vexia-purple/50 hover:shadow-[0_14px_34px_-10px_rgba(123,47,190,0.45)] focus:border-vexia-cyan/60 focus:shadow-[0_0_30px_rgba(0,200,255,0.25)]"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {showPoster ? (
            <img
              src={active.poster}
              alt={active.title}
              loading="lazy"
              onError={() => setBroken(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: active.posterPosition ?? "center" }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-vexia-purple/40 to-black">
              <ImageOff className="h-6 w-6 text-vexia-cyan/70" aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />
          {/* brilho espelhado */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-vexia-purple/25 via-transparent to-transparent" />
          {active.rating > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] font-black text-vexia-gold backdrop-blur-md">
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {active.rating.toFixed(1)}
            </span>
          ) : null}
          {progress != null ? (
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-vexia-purple to-vexia-cyan shadow-[0_0_10px_rgba(123,47,190,0.8)]"
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
            ? "border-vexia-purple/60 bg-vexia-purple/80 shadow-[0_0_14px_rgba(123,47,190,0.7)]"
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
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6 lg:grid-cols-8">
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
        className="vexia-focus rounded-full border border-white/10 bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-9 py-3 text-xs font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_28px_-10px_rgba(123,47,190,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-8px_rgba(123,47,190,1)]"
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
