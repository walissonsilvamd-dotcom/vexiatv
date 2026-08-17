import { useMemo } from "react";
import type { MediaItem } from "../../data/vexia";
import { usePlaylist } from "../../lib/playlist-store";
import { useTmdbHeroes } from "../../lib/use-tmdb";
import { isAdultText } from "../../lib/parental";
import { Carousel } from "./Carousel";
import { Link } from "@tanstack/react-router";

function byRating(a: MediaItem, b: MediaItem) {
  return b.rating - a.rating;
}

function byRelease(a: MediaItem, b: MediaItem) {
  const da = a.releaseDate ? Date.parse(a.releaseDate) : a.year * 10000;
  const db = b.releaseDate ? Date.parse(b.releaseDate) : b.year * 10000;
  return (db || 0) - (da || 0);
}

export function DiscoverRows() {
  const { movies, series, hasContent } = usePlaylist();

  // Filtragem unificada de conteúdo adulto e amostra inicial
  const movieSample = useMemo(
    () => movies.filter((m) => !isAdultText(m.title, m.category, ...m.genres)).slice(0, 100),
    [movies]
  );
  const seriesSample = useMemo(
    () => series.filter((s) => !isAdultText(s.title, s.category, ...s.genres)).slice(0, 100),
    [series]
  );

  const richMovies = useTmdbHeroes(movieSample, "movie");
  const richSeries = useTmdbHeroes(seriesSample, "series");

  // Melhores Filmes (Top 10)
  const topMovies = useMemo(
    () => richMovies.sort(byRating).slice(0, 10),
    [richMovies]
  );

  // Melhores Séries (Top 10)
  const topSeries = useMemo(
    () => richSeries.sort(byRating).slice(0, 10),
    [richSeries]
  );

  if (!hasContent) return null;

  return (
    <div className="space-y-24 px-[5vw] py-24">
      {/* Ranking Filmes */}
      <section className="space-y-6">
        <h2 className="flex items-center gap-3 text-2xl font-black uppercase tracking-[0.25em] text-white">
          <span className="text-vexia-purple">01</span> 10 Melhores Filmes
        </h2>
        <div className="vexia-fade-edges vexia-smooth-scroll flex gap-8 overflow-x-auto pb-8 vexia-scroll">
          {topMovies.map((item, index) => (
            <Link
              key={item.id}
              to="/detalhes/$id"
              params={{ id: item.id }}
              className="group relative flex w-[280px] shrink-0 items-end gap-2 outline-none"
            >
              <span className="mb-[-20px] text-[120px] font-black leading-none text-white/10 transition-colors group-focus:text-vexia-purple/40 group-hover:text-vexia-purple/30">
                {index + 1}
              </span>
              <div className="vexia-card-focus relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-105 group-focus:scale-105">
                <img
                  src={item.poster || item.backdrop}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="line-clamp-1 text-sm font-black uppercase tracking-wider">{item.title}</p>
                  <p className="text-xs font-bold text-vexia-purple">{item.rating.toFixed(1)} ⭐</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Ranking Séries */}
      <section className="space-y-6">
        <h2 className="flex items-center gap-3 text-2xl font-black uppercase tracking-[0.25em] text-white">
          <span className="text-vexia-cyan">02</span> 10 Melhores Séries
        </h2>
        <div className="vexia-fade-edges vexia-smooth-scroll flex gap-8 overflow-x-auto pb-8 vexia-scroll">
          {topSeries.map((item, index) => (
            <Link
              key={item.id}
              to="/detalhes/$id"
              params={{ id: item.id }}
              className="group relative flex w-[280px] shrink-0 items-end gap-2 outline-none"
            >
              <span className="mb-[-20px] text-[120px] font-black leading-none text-white/10 transition-colors group-focus:text-vexia-cyan/40 group-hover:text-vexia-cyan/30">
                {index + 1}
              </span>
              <div className="vexia-card-focus relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-105 group-focus:scale-105">
                <img
                  src={item.poster || item.backdrop}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="line-clamp-1 text-sm font-black uppercase tracking-wider">{item.title}</p>
                  <p className="text-xs font-bold text-vexia-cyan">{item.rating.toFixed(1)} ⭐</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
