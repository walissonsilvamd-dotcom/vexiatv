import { useMemo, useState } from "react";
import type { MediaItem } from "../../data/vexia";
import { normalizeName } from "../../lib/favorites-store";
import { COUNTRY_CODES } from "../../lib/filters-store";
import { useWatchHistory } from "../../lib/history-store";
import { usePlaylist } from "../../lib/playlist-store";
import { useTmdbHeroes } from "../../lib/use-tmdb";
import { Carousel } from "./Carousel";

const SAMPLE_MOVIES = 36;
const SAMPLE_SERIES = 24;
const ROW = 12;

const COUNTRY_CHIPS = ["Brasil", "EUA", "Japão", "Coreia", "Reino Unido"];
const GENRE_CHIPS = ["Ação", "Drama", "Comédia", "Terror", "Animação", "Romance"];

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function byRating(a: MediaItem, b: MediaItem) {
  return b.rating - a.rating;
}

function byRelease(a: MediaItem, b: MediaItem) {
  const da = a.releaseDate ? Date.parse(a.releaseDate) : a.year * 10000;
  const db = b.releaseDate ? Date.parse(b.releaseDate) : b.year * 10000;
  return (db || 0) - (da || 0);
}

/**
 * Carrosséis premium de descoberta.
 * Base: lista M3U/HLS já carregada; complemento: TMDB (nota, país, gênero, ano).
 */
export function DiscoverRows() {
  const { movies, series, hasContent } = usePlaylist();
  const { history } = useWatchHistory();
  const [country, setCountry] = useState(COUNTRY_CHIPS[0]);
  const [genre, setGenre] = useState(GENRE_CHIPS[0]);

  const movieSample = useMemo(() => movies.slice(0, SAMPLE_MOVIES), [movies]);
  const seriesSample = useMemo(() => series.slice(0, SAMPLE_SERIES), [series]);

  const richMovies = useTmdbHeroes(movieSample, "movie");
  const richSeries = useTmdbHeroes(seriesSample, "series");

  // 🔥 Em alta: o que mais aparece no histórico local, reconciliado com a lista.
  const trending = useMemo(() => {
    if (history.length === 0) return [];
    const wanted = new Set(history.map((h) => normalizeName(h.name)));
    return [...richMovies, ...richSeries].filter((item) => wanted.has(normalizeName(item.title)));
  }, [history, richMovies, richSeries]);

  const topRated = useMemo(
    () => [...richMovies, ...richSeries].filter((m) => m.rating >= 7).sort(byRating).slice(0, 20),
    [richMovies, richSeries],
  );

  const byCountry = useMemo(() => {
    const codes = COUNTRY_CODES[country] ?? [];
    return richMovies
      .filter((m) => (m.countries ?? []).some((c) => codes.includes(c.toUpperCase())))
      .slice(0, 20);
  }, [richMovies, country]);

  const byGenre = useMemo(() => {
    const target = norm(genre);
    return [...richMovies, ...richSeries]
      .filter((m) => m.genres.some((g) => norm(g).includes(target)))
      .slice(0, 20);
  }, [richMovies, richSeries, genre]);

  const releases = useMemo(
    () => [...richMovies].filter((m) => m.year > 0).sort(byRelease).slice(0, 20),
    [richMovies],
  );

  const popularSeries = useMemo(
    () => [...richSeries].sort(byRating).slice(0, 20),
    [richSeries],
  );

  if (!hasContent) return null;

  return (
    <div className="space-y-7 px-[5vw] py-8">
      <Carousel
        title="Em alta"
        icon="🔥"
        items={trending}
        kind="movie"
        navRow={ROW}
      />
      <Carousel
        title="Melhores avaliados"
        icon="⭐"
        items={topRated}
        kind="movie"
        navRow={ROW + 2}
      />
      <Carousel
        title="Filmes por país"
        icon="🌎"
        items={byCountry}
        kind="movie"
        navRow={ROW + 4}
        chips={COUNTRY_CHIPS}
        activeChip={country}
        onChip={setCountry}
      />
      <Carousel
        title="Por gênero"
        icon="🎬"
        items={byGenre}
        kind="movie"
        navRow={ROW + 6}
        chips={GENRE_CHIPS}
        activeChip={genre}
        onChip={setGenre}
      />
      <Carousel
        title="Lançamentos"
        icon="🆕"
        items={releases}
        kind="movie"
        navRow={ROW + 8}
      />
      <Carousel
        title="Séries populares"
        icon="📺"
        items={popularSeries}
        kind="series"
        navRow={ROW + 10}
      />
    </div>
  );
}
