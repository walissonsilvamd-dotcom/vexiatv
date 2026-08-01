/**
 * Caminho rápido de carregamento para listas Xtream (get.php?username=...).
 *
 * Em vez de baixar o M3U inteiro (na lista do usuário: 134 MB / 533 mil linhas),
 * consulta a API do painel (player_api.php), que devolve o mesmo catálogo em
 * JSON já categorizado: canais + filmes + séries em ~23 MB.
 * Os episódios de cada série são buscados só quando a série é aberta.
 */
import type { MediaItem } from "../data/vexia";
import { detectAudio } from "./filters-store";
import type { ParsedPlaylist, PlaylistChannel, PlaylistEpisode, PlaylistSeries } from "./m3u";
import { stableId } from "../utils/hash";

export type XtreamCreds = {
  /** http(s)://host[:porta] */
  base: string;
  username: string;
  password: string;
};

/** Extrai as credenciais de um link get.php / player_api.php. */
export function xtreamCreds(playlistUrl: string): XtreamCreds | null {
  try {
    const u = new URL(playlistUrl);
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (!username || !password) return null;
    if (!/get\.php|player_api\.php|panel_api\.php/i.test(u.pathname)) return null;
    return { base: `${u.protocol}//${u.host}`, username, password };
  } catch {
    return null;
  }
}

function apiUrl(creds: XtreamCreds, action: string, extra = "") {
  return `${creds.base}/player_api.php?username=${encodeURIComponent(
    creds.username,
  )}&password=${encodeURIComponent(creds.password)}&action=${action}${extra}`;
}

/** Todas as chamadas passam pelo proxy do app (evita CORS e conteúdo misto). */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/public/playlist?url=${encodeURIComponent(url)}`, { signal });
  if (!res.ok || res.headers.get("X-Playlist-Error") === "1") {
    throw new Error(await res.text().catch(() => "Servidor da lista indisponível."));
  }
  return (await res.json()) as T;
}

type Category = { category_id?: string | number; category_name?: string };
type LiveStream = {
  name?: string;
  stream_id?: number | string;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string | number;
};
type VodStream = {
  name?: string;
  title?: string;
  year?: string | number;
  stream_id?: number | string;
  stream_icon?: string;
  rating?: string | number;
  plot?: string;
  container_extension?: string;
  category_id?: string | number;
};
type SeriesItem = {
  name?: string;
  title?: string;
  year?: string | number;
  series_id?: number | string;
  cover?: string;
  plot?: string;
  rating?: string | number;
  genre?: string;
  backdrop_path?: string[];
  category_id?: string | number;
  episode_run_time?: string | number;
};

function catMap(list: Category[] | null | undefined) {
  const map = new Map<string, string>();
  for (const c of list ?? []) {
    if (c?.category_id !== undefined) map.set(String(c.category_id), c.category_name || "Sem categoria");
  }
  return map;
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanName(value: string) {
  return value
    .replace(/\((19|20)\d{2}\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function initialsOf(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "TV"
  );
}

function uniqueCats(values: Iterable<string>) {
  return ["Todos", ...Array.from(new Set([...values].filter(Boolean))).sort((a, b) => a.localeCompare(b))];
}

export type XtreamProgress = (done: number, total: number) => void;

/**
 * Monta o catálogo completo (canais, filmes, séries) a partir da API do painel.
 * Lança erro quando o servidor não expõe player_api — o chamador cai no M3U.
 */
export async function fetchXtreamCatalog(
  playlistUrl: string,
  onProgress?: XtreamProgress,
  signal?: AbortSignal,
): Promise<ParsedPlaylist> {
  const creds = xtreamCreds(playlistUrl);
  if (!creds) throw new Error("Link sem credenciais Xtream.");

  const requests = [
    apiUrl(creds, "get_live_categories"),
    apiUrl(creds, "get_vod_categories"),
    apiUrl(creds, "get_series_categories"),
    apiUrl(creds, "get_live_streams"),
    apiUrl(creds, "get_vod_streams"),
    apiUrl(creds, "get_series"),
  ];

  let done = 0;
  const total = requests.length;
  onProgress?.(0, total);
  const track = <T>(p: Promise<T>) =>
    p.then((value) => {
      onProgress?.(++done, total);
      return value;
    });

  // Tudo em paralelo: o gargalo passa a ser só a maior resposta.
  const [liveCats, vodCats, serCats, live, vod, series] = await Promise.all([
    track(getJson<Category[]>(requests[0], signal)),
    track(getJson<Category[]>(requests[1], signal)),
    track(getJson<Category[]>(requests[2], signal)),
    track(getJson<LiveStream[]>(requests[3], signal)),
    track(getJson<VodStream[]>(requests[4], signal)),
    track(getJson<SeriesItem[]>(requests[5], signal)),
  ]);

  if (!Array.isArray(live) || !Array.isArray(vod) || !Array.isArray(series)) {
    throw new Error("A API da lista não devolveu o catálogo esperado.");
  }

  const liveMap = catMap(liveCats);
  const vodMap = catMap(vodCats);
  const serMap = catMap(serCats);
  const streamPrefix = `${creds.base}/${creds.username}/${creds.password}`;

  const channels: PlaylistChannel[] = live.map((c) => {
    const name = (c.name || "Canal").trim();
    const category = liveMap.get(String(c.category_id)) || "Sem categoria";
    const url = `${streamPrefix}/${c.stream_id}.m3u8`;
    return {
      id: stableId("ch", name, url),
      name,
      category,
      group: category,
      now: category,
      initials: initialsOf(name),
      logo: c.stream_icon || "",
      url,
      schedule: "AO VIVO",
      tvgId: String((c as { epg_channel_id?: string }).epg_channel_id || ""),
    };
  });

  const movies: MediaItem[] = vod.map((m) => {
    const rawName = (m.name || m.title || "Filme").trim();
    const category = vodMap.get(String(m.category_id)) || "Sem categoria";
    const ext = m.container_extension || "mp4";
    const url = `${creds.base}/movie/${creds.username}/${creds.password}/${m.stream_id}.${ext}`;
    return {
      id: stableId("mv", rawName, url),
      title: cleanName(m.title || rawName) || rawName,
      year: num(m.year) || num((rawName.match(/(19|20)\d{2}/) ?? [])[0]),
      rating: num(m.rating),
      genres: [category],
      category,
      audio: detectAudio(`${rawName} ${category}`),
      overview: m.plot || "",
      backdrop: m.stream_icon || "",
      poster: m.stream_icon || "",
      streamUrl: url,
    };
  });

  const seriesList: PlaylistSeries[] = series.map((s) => {
    const rawName = (s.name || s.title || "Série").trim();
    const category = serMap.get(String(s.category_id)) || "Sem categoria";
    const cover = s.cover || s.backdrop_path?.[0] || "";
    return {
      id: stableId("sr", rawName, String(s.series_id)),
      seriesId: num(s.series_id),
      title: cleanName(s.title || rawName) || rawName,
      year: num(s.year) || num((rawName.match(/(19|20)\d{2}/) ?? [])[0]),
      rating: num(s.rating),
      genres: [category],
      category,
      audio: detectAudio(`${rawName} ${category}`),
      overview: s.plot || "",
      backdrop: s.backdrop_path?.[0] || cover,
      poster: cover,
      seasons: 0,
      episodes: 0,
      // Episódios são buscados só ao abrir a série (mantém o load leve).
      episodesList: [],
    };
  });

  return {
    movies,
    series: seriesList,
    channels,
    movieCategories: uniqueCats(movies.map((m) => m.category ?? "")),
    seriesCategories: uniqueCats(seriesList.map((s) => s.category ?? "")),
    channelCategories: uniqueCats(channels.map((c) => c.category)),
    total: movies.length + seriesList.length + channels.length,
  };
}

type SeriesInfo = {
  episodes?: Record<
    string,
    {
      id?: string | number;
      episode_num?: string | number;
      title?: string;
      container_extension?: string;
      info?: { name?: string; plot?: string; movie_image?: string; cover_big?: string; duration_secs?: number };
    }[]
  >;
};

/**
 * Busca os episódios de uma série pelo painel Xtream.
 *
 * O resultado normalizado fica em cache persistente (localStorage, TTL 12h),
 * como no APK base: voltar para a mesma série não refaz a requisição, e o
 * carrossel/temporadas aparecem instantaneamente.
 */
export async function fetchXtreamEpisodes(
  playlistUrl: string,
  seriesId: number,
  signal?: AbortSignal,
): Promise<PlaylistEpisode[]> {
  const creds = xtreamCreds(playlistUrl);
  if (!creds || !seriesId) return [];

  return cachedInfo<PlaylistEpisode[]>(`sr|${creds.base}|${seriesId}`, async () => {
    const info = await getJson<SeriesInfo>(
      apiUrl(creds, "get_series_info", `&series_id=${seriesId}`),
      signal,
    );

    const out: PlaylistEpisode[] = [];
    for (const [seasonKey, list] of Object.entries(info.episodes ?? {})) {
      const season = num(seasonKey) || 1;
      for (const ep of list ?? []) {
        const ext = ep.container_extension || "mp4";
        const url = `${creds.base}/series/${creds.username}/${creds.password}/${ep.id}.${ext}`;
        out.push({
          id: stableId("ep", String(seriesId), url),
          season,
          number: num(ep.episode_num),
          title: ep.info?.name || ep.title || `Episódio ${num(ep.episode_num)}`,
          url,
          thumb: ep.info?.movie_image || ep.info?.cover_big || "",
          runtimeMin: ep.info?.duration_secs ? Math.round(ep.info.duration_secs / 60) : 0,
          overview: ep.info?.plot || "",
        });
      }
    }
    out.sort((a, b) => a.season - b.season || a.number - b.number);
    return out;
  });
}

export type XtreamVodInfo = {
  plot: string;
  cover: string;
  backdrop: string;
  rating: number;
  runtimeMin: number;
  genre: string;
  cast: string;
  director: string;
  releaseDate: string;
};

type VodInfoResponse = {
  info?: {
    plot?: string;
    description?: string;
    movie_image?: string;
    cover_big?: string;
    backdrop_path?: string[];
    rating?: string | number;
    duration_secs?: number;
    genre?: string;
    cast?: string;
    actors?: string;
    director?: string;
    releasedate?: string;
    releaseDate?: string;
  };
};

/**
 * Detalhes de um filme pelo painel (`get_vod_info`), em cache persistente.
 * Usado tanto na tela de detalhes quanto no prefetch por foco.
 */
export async function fetchXtreamVodInfo(
  playlistUrl: string,
  streamId: number,
  signal?: AbortSignal,
): Promise<XtreamVodInfo | null> {
  const creds = xtreamCreds(playlistUrl);
  if (!creds || !streamId) return null;

  return cachedInfo<XtreamVodInfo | null>(`vd|${creds.base}|${streamId}`, async () => {
    const data = await getJson<VodInfoResponse>(
      apiUrl(creds, "get_vod_info", `&vod_id=${streamId}`),
      signal,
    );
    const info = data.info;
    if (!info) return null;
    return {
      plot: info.plot || info.description || "",
      cover: info.movie_image || info.cover_big || "",
      backdrop: info.backdrop_path?.[0] || "",
      rating: num(info.rating),
      runtimeMin: info.duration_secs ? Math.round(info.duration_secs / 60) : 0,
      genre: info.genre || "",
      cast: info.cast || info.actors || "",
      director: info.director || "",
      releaseDate: info.releasedate || info.releaseDate || "",
    };
  });
}

