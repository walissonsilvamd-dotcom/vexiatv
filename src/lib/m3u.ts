import type { MediaItem } from "../data/vexia";
import { detectAudio } from "./filters-store";
import { stableId } from "../utils/hash";

export type M3UEntry = {
  name: string;
  logo: string;
  group: string;
  url: string;
  tvgId: string;
  /** Duração declarada no #EXTINF (segundos). 0/-1 quando ao vivo ou ausente. */
  durationSec: number;
  /** Sinopse trazida pela própria lista (Xtream costuma enviar em plot/description). */
  description: string;
};

export type PlaylistEpisode = {
  id: string;
  season: number;
  number: number;
  title: string;
  url: string;
  thumb: string;
  /** Duração vinda da lista (minutos), usada quando o TMDB não responde. */
  runtimeMin: number;
  /** Sinopse vinda da lista, usada quando o TMDB não responde. */
  overview: string;
};

export type PlaylistSeries = MediaItem & {
  episodesList: PlaylistEpisode[];
};

export type PlaylistChannel = {
  id: string;
  name: string;
  category: string;
  group: string;
  now: string;
  initials: string;
  logo: string;
  url: string;
  schedule: string;
};

export type ParsedPlaylist = {
  movies: MediaItem[];
  series: PlaylistSeries[];
  channels: PlaylistChannel[];
  movieCategories: string[];
  seriesCategories: string[];
  channelCategories: string[];
  total: number;
};

const ATTR_RE = /([a-zA-Z0-9-]+)="([^"]*)"/g;
const SERIES_RE = /\bS\s?(\d{1,2})\s?[\s._-]?\s?E\s?(\d{1,3})\b/i;
const VOD_EXT_RE = /\.(mp4|mkv|avi|mov|m4v)(\?|$)/i;

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function initialsOf(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function yearOf(name: string) {
  const m = name.match(/\((19|20)\d{2}\)/) ?? name.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0].replace(/[()]/g, "")) : 0;
}

function cleanTitle(name: string) {
  return name
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\((19|20)\d{2}\)/, "")
    .replace(SERIES_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[-–|]\s*$/, "")
    .trim();
}

/** Converte o texto bruto de uma lista M3U em entradas estruturadas. */
export function parseM3U(text: string, onProgress?: (ratio: number) => void): M3UEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3UEntry[] = [];
  let pending: Omit<M3UEntry, "url"> | null = null;
  const total = lines.length || 1;

  for (let index = 0; index < lines.length; index++) {
    if (onProgress && (index & 2047) === 0) onProgress(index / total);
    const raw = lines[index];
    const line = raw.trim();
    if (!line) continue;

    if (line.toUpperCase().startsWith("#EXTINF")) {
      const attrs: Record<string, string> = {};
      ATTR_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = ATTR_RE.exec(line)) !== null) attrs[m[1].toLowerCase()] = m[2];
      const name = line.slice(line.lastIndexOf(",") + 1).trim();
      const durationRaw = Number.parseFloat(line.slice(line.indexOf(":") + 1));
      pending = {
        name: name || attrs["tvg-name"] || "Sem título",
        logo: attrs["tvg-logo"] || attrs["tvg-thumb"] || attrs["logo"] || "",
        group: attrs["group-title"] ?? "Sem categoria",
        tvgId: attrs["tvg-id"] ?? "",
        durationSec: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : 0,
        description:
          attrs["plot"] || attrs["description"] || attrs["tvg-description"] || attrs["overview"] || "",
      };
      continue;
    }

    if (line.startsWith("#")) continue;

    if (pending) {
      entries.push({ ...pending, url: line });
      pending = null;
    }
  }

  return entries;
}

type Kind = "movie" | "series" | "channel";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LIVE_RE = /\b(canais|canal|ao vivo|live|tv|esporte|abertos|noticias|24h|ppv)\b/;
const SERIES_GROUP_RE = /\b(series?|serie|seriados?|temporadas?|season|novelas?|animes?|doramas?|tv ?shows?)\b/;
const MOVIE_GROUP_RE = /\b(filmes?|movies?|vod|cinema|lancamentos?|colecao|colecoes|4k)\b/;

function classify(entry: M3UEntry): Kind {
  const group = normalize(entry.group);
  const name = normalize(entry.name);

  // Episódio identificado pelo padrão SxxEyy sempre é série
  if (SERIES_RE.test(entry.name)) return "series";
  if (SERIES_GROUP_RE.test(group)) return "series";
  if (MOVIE_GROUP_RE.test(group)) return "movie";
  if (LIVE_RE.test(group)) return "channel";
  // Arquivo de vídeo sob demanda sem categoria clara
  if (VOD_EXT_RE.test(entry.url)) return SERIES_RE.test(name) ? "series" : "movie";
  return "channel";
}

function toMedia(entry: M3UEntry, id: string): MediaItem {
  const title = cleanTitle(entry.name) || entry.name;
  return {
    id,
    title,
    year: yearOf(entry.name),
    rating: 0,
    genres: [entry.group],
    category: entry.group,
    audio: detectAudio(`${entry.name} ${entry.group}`),
    overview: "",
    backdrop: entry.logo,
    poster: entry.logo,
    streamUrl: entry.url,
  };
}

function uniqueCats(values: string[]) {
  return ["Todos", ...Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))];
}

/** Organiza as entradas da lista em filmes, séries (com episódios) e canais ao vivo. */
export function buildPlaylist(entries: M3UEntry[]): ParsedPlaylist {
  const movies: MediaItem[] = [];
  const channels: PlaylistChannel[] = [];
  const seriesMap = new Map<string, PlaylistSeries>();

  entries.forEach((entry) => {
    const kind = classify(entry);

    if (kind === "movie") {
      movies.push(toMedia(entry, stableId("mv", entry.name, entry.url)));
      return;
    }

    if (kind === "series") {
      const match = entry.name.match(SERIES_RE);
      const season = match ? Number(match[1]) : 1;
      const number = match ? Number(match[2]) : seriesMap.size + 1;
      const base = cleanTitle(entry.name) || entry.name;
      const key = `${slug(base)}|${slug(entry.group)}`;

      let serie = seriesMap.get(key);
      if (!serie) {
        serie = {
          ...toMedia(entry, stableId("sr", base, entry.group)),
          title: base,
          seasons: 0,
          episodes: 0,
          episodesList: [],
        };
        seriesMap.set(key, serie);
      }
      serie.episodesList.push({
        id: stableId("ep", serie.id, entry.url),
        season,
        number,
        title: entry.name,
        url: entry.url,
        thumb: entry.logo || serie.poster,
        runtimeMin: entry.durationSec ? Math.round(entry.durationSec / 60) : 0,
        overview: entry.description || "",
      });
      return;
    }

    channels.push({
      id: stableId("ch", entry.name, entry.url),
      name: entry.name,
      category: entry.group,
      group: entry.group,
      now: entry.group,
      initials: initialsOf(entry.name) || "TV",
      logo: entry.logo,
      url: entry.url,
      schedule: "AO VIVO",
    });
  });

  const series = Array.from(seriesMap.values()).map((s) => {
    s.episodesList.sort((a, b) => a.season - b.season || a.number - b.number);
    s.seasons = new Set(s.episodesList.map((e) => e.season)).size;
    s.episodes = s.episodesList.length;
    return s;
  });

  return {
    movies,
    series,
    channels,
    movieCategories: uniqueCats(movies.map((m) => m.genres[0])),
    seriesCategories: uniqueCats(series.map((s) => s.genres[0])),
    channelCategories: uniqueCats(channels.map((c) => c.category)),
    total: entries.length,
  };
}

export function parsePlaylistText(text: string): ParsedPlaylist {
  return buildPlaylist(parseM3U(text));
}
