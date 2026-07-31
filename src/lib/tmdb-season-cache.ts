/**
 * Cache persistente dos episódios de uma temporada (TMDB).
 *
 * Sem isso, cada entrada em uma série volta a baixar nomes, sinopses e stills.
 * Guardamos por título+ano+temporada no localStorage (TTL 7 dias) para que a
 * navegação entre séries reaproveite tudo o que já foi buscado — e as imagens
 * dos capítulos já caem no cache de imagens do app.
 */

import type { TmdbEpisodeMeta } from "./use-tmdb-season";
import { prefetchThroughCache, rememberWarm } from "./image-cache";

const STORAGE_KEY = "vexia.tmdb.season.v1";
const TTL = 1000 * 60 * 60 * 24 * 7;
const MAX_ENTRIES = 400;
const FLUSH_DELAY = 800;

type Entry = { v: TmdbEpisodeMeta[]; t: number; a: number };
type Shape = Record<string, Entry>;

let memory: Shape | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(4k|fhd|hd|sd|h265|hevc|dublado|legendado|leg|dub)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function seasonCacheKey(title: string, year: number | undefined, season: number) {
  return `${normalize(title)}|${year || ""}|s${season}`;
}

function load(): Shape {
  if (memory) return memory;
  if (typeof window === "undefined") {
    memory = {};
    return memory;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as Shape) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function scheduleFlush() {
  if (typeof window === "undefined" || timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (!dirty || !memory) return;
    dirty = false;
    try {
      const entries = Object.entries(memory);
      if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => b[1].a - a[1].a);
        memory = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      try {
        const entries = Object.entries(memory ?? {}).sort((a, b) => b[1].a - a[1].a);
        memory = Object.fromEntries(entries.slice(0, Math.floor(MAX_ENTRIES / 2)));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
      } catch {
        /* desiste silenciosamente */
      }
    }
  }, FLUSH_DELAY);
}

export function readSeasonCache(key: string): TmdbEpisodeMeta[] | undefined {
  const cache = load();
  const entry = cache[key];
  if (!entry) return undefined;
  if (Date.now() - entry.t > TTL) {
    delete cache[key];
    dirty = true;
    scheduleFlush();
    return undefined;
  }
  entry.a = Date.now();
  dirty = true;
  scheduleFlush();
  return entry.v;
}

export function writeSeasonCache(key: string, value: TmdbEpisodeMeta[]) {
  const cache = load();
  const now = Date.now();
  cache[key] = { v: value, t: now, a: now };
  dirty = true;
  scheduleFlush();
}

/**
 * Manda os stills para o Service Worker de imagens: na próxima visita (ou ao
 * abrir o carrossel) as miniaturas já vêm do cache, sem novo download.
 */
export function warmSeasonStills(episodes: TmdbEpisodeMeta[]) {
  const urls = episodes.map((e) => e.still).filter(Boolean).slice(0, 40);
  if (!urls.length) return;
  rememberWarm(urls);
  prefetchThroughCache(urls);
}
