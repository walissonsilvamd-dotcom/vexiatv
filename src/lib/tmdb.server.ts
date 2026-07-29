import type { MediaItem } from "../data/vexia";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

export type TmdbKind = "movie" | "tv";

type TmdbSearchResult = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  overview?: string;
};

type TmdbGenre = { id: number; name: string };

type TmdbCrew = { id: number; name: string; job: string };
type TmdbCast = { id: number; name: string; character?: string; profile_path?: string | null };

type TmdbMovieDetails = {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  runtime: number;
  vote_average: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  credits?: { cast: TmdbCast[]; crew: TmdbCrew[] };
};

type TmdbTvDetails = {
  id: number;
  name: string;
  original_name: string;
  first_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  vote_average: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  credits?: { cast: TmdbCast[]; crew: TmdbCrew[] };
};

export function tmdbImageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMG_BASE}/${size}${path}` : "";
}

export function runtimeLabel(minutes: number) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export function normalizeTmdb(
  details: TmdbMovieDetails | TmdbTvDetails,
  kind: TmdbKind,
): Partial<MediaItem> {
  const isMovie = kind === "movie";
  const movie = details as TmdbMovieDetails;
  const tv = details as TmdbTvDetails;

  const title = isMovie ? movie.title : tv.name;
  const originalTitle = isMovie ? movie.original_title : tv.original_name;
  const year = isMovie
    ? Number(movie.release_date?.slice(0, 4)) || 0
    : Number(tv.first_air_date?.slice(0, 4)) || 0;
  const runtime = isMovie ? runtimeLabel(movie.runtime) : "";
  const seasons = isMovie ? undefined : tv.number_of_seasons;
  const episodes = isMovie ? undefined : tv.number_of_episodes;

  const cast = details.credits?.cast?.slice(0, 5).map((c) => c.name);
  const director = details.credits?.crew?.find((c) => c.job === "Director")?.name;

  return {
    title,
    originalTitle,
    year,
    rating: details.vote_average ?? 0,
    genres: details.genres?.map((g) => g.name) ?? [],
    overview: details.overview ?? "",
    runtime,
    seasons,
    episodes,
    cast,
    director,
    backdrop: tmdbImageUrl(details.backdrop_path, "w1280"),
    poster: tmdbImageUrl(details.poster_path, "w500"),
  };
}

export async function searchTmdb(
  credential: string,
  title: string,
  year: number | undefined,
  kind: TmdbKind,
  language: string,
): Promise<Partial<MediaItem> | null> {
  // Token v4 (JWT) usa Bearer; chave v3 vai na query string.
  const isBearer = credential.split(".").length === 3;
  const headers: Record<string, string> = {
    "User-Agent": "VEXIA TV/1.0",
    accept: "application/json",
  };
  if (isBearer) headers.Authorization = `Bearer ${credential}`;
  const auth = isBearer ? "" : `api_key=${credential}&`;

  const encoded = encodeURIComponent(title);
  const url = `${TMDB_BASE}/search/${kind}?${auth}query=${encoded}&language=${language}${year ? `&year=${year}` : ""}`;
  const response = await fetch(url, { headers });
  if (!response.ok) return null;

  const json = (await response.json()) as { results?: TmdbSearchResult[] };
  const result = json.results?.[0];
  if (!result) return null;

  const detailsUrl = `${TMDB_BASE}/${kind}/${result.id}?${auth}language=${language}&append_to_response=credits`;
  const detailsRes = await fetch(detailsUrl, { headers });
  if (!detailsRes.ok) return null;

  const details = (await detailsRes.json()) as TmdbMovieDetails | TmdbTvDetails;
  return normalizeTmdb(details, kind);
}
