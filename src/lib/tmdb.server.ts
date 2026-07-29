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
  production_countries?: { iso_3166_1: string }[];
  origin_country?: string[];
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
  production_countries?: { iso_3166_1: string }[];
  origin_country?: string[];
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
  const runtimeMin = isMovie ? movie.runtime || 0 : (tv.episode_run_time?.[0] ?? 0);
  const runtime = runtimeLabel(runtimeMin);
  const releaseDate = isMovie ? movie.release_date : tv.first_air_date;
  const countries = Array.from(
    new Set([
      ...(details.production_countries?.map((c) => c.iso_3166_1) ?? []),
      ...(details.origin_country ?? []),
    ]),
  );
  const seasons = isMovie ? undefined : tv.number_of_seasons;
  const episodes = isMovie ? undefined : tv.number_of_episodes;

  const cast = details.credits?.cast?.slice(0, 10).map((c) => c.name);
  const castList = details.credits?.cast?.slice(0, 10).map((c) => ({
    name: c.name,
    character: c.character,
    photo: tmdbImageUrl(c.profile_path, "w185"),
  }));
  const director = details.credits?.crew?.find((c) => c.job === "Director")?.name;

  return {
    title,
    originalTitle,
    year,
    rating: details.vote_average ?? 0,
    genres: details.genres?.map((g) => g.name) ?? [],
    overview: details.overview ?? "",
    runtime,
    runtimeMin,
    releaseDate,
    countries,
    seasons,
    episodes,
    cast,
    castList,
    director,
    backdrop: tmdbImageUrl(details.backdrop_path, "w1280"),
    poster: tmdbImageUrl(details.poster_path, "w500"),
  };
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Matching por nome + ano; evita títulos homônimos de outros anos. */
function pickBestMatch(results: TmdbSearchResult[], title: string, year?: number) {
  if (results.length === 0) return null;
  const target = slug(title);
  let best: { item: TmdbSearchResult; score: number } | null = null;

  for (const item of results) {
    const name = slug(item.title ?? item.name ?? "");
    const original = slug(item.original_title ?? item.original_name ?? "");
    const itemYear = Number((item.release_date ?? item.first_air_date ?? "").slice(0, 4)) || 0;

    let score = 0;
    if (name === target || original === target) score += 60;
    else if (name.includes(target) || target.includes(name)) score += 30;
    if (year && itemYear) score += itemYear === year ? 30 : Math.abs(itemYear - year) <= 1 ? 12 : -25;
    score += Math.min((item.vote_average ?? 0) / 2, 5);

    if (!best || score > best.score) best = { item, score };
  }

  // Sem nenhuma semelhança de nome nem de ano, é melhor manter os dados da lista.
  return best && best.score > 5 ? best.item : null;
}

/** Cache em memória do runtime (TTL 12h) + dedupe de requisições concorrentes. */
const SERVER_TTL = 1000 * 60 * 60 * 12;
const SERVER_MISS_TTL = 1000 * 60 * 30;
const SERVER_MAX = 800;
const serverCache = new Map<string, { value: Partial<MediaItem> | null; at: number }>();
const serverInflight = new Map<string, Promise<Partial<MediaItem> | null>>();

function cacheKey(title: string, year: number | undefined, kind: TmdbKind, language: string) {
  return `${kind}|${language}|${slug(title)}|${year || ""}`;
}

export async function searchTmdb(
  credential: string,
  title: string,
  year: number | undefined,
  kind: TmdbKind,
  language: string,
): Promise<Partial<MediaItem> | null> {
  const key = cacheKey(title, year, kind, language);
  const cached = serverCache.get(key);
  if (cached) {
    const ttl = cached.value ? SERVER_TTL : SERVER_MISS_TTL;
    if (Date.now() - cached.at < ttl) return cached.value;
    serverCache.delete(key);
  }

  const running = serverInflight.get(key);
  if (running) return running;

  const promise = (async () => {
    try {
      const value = await fetchTmdb(credential, title, year, kind, language);
      if (serverCache.size >= SERVER_MAX) {
        const oldest = serverCache.keys().next().value;
        if (oldest) serverCache.delete(oldest);
      }
      serverCache.set(key, { value, at: Date.now() });
      return value;
    } finally {
      serverInflight.delete(key);
    }
  })();

  serverInflight.set(key, promise);
  return promise;
}

async function fetchTmdb(
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
  const result = pickBestMatch(json.results ?? [], title, year);
  if (!result) return null;

  const detailsUrl = `${TMDB_BASE}/${kind}/${result.id}?${auth}language=${language}&append_to_response=credits`;
  const detailsRes = await fetch(detailsUrl, { headers });
  if (!detailsRes.ok) return null;

  const details = (await detailsRes.json()) as TmdbMovieDetails | TmdbTvDetails;
  return normalizeTmdb(details, kind);
}

