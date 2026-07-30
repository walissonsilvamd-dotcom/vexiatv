import type { MediaItem } from "../data/vexia";

/**
 * Cache persistente de metadados TMDB.
 * - Chave normalizada (título + ano + tipo) para reaproveitar entre itens duplicados.
 * - TTL de 7 dias para acertos e 1 dia para "não encontrado" (cache negativo).
 * - Limite LRU para não estourar o localStorage da TV.
 */

const STORAGE_KEY = "vexia.tmdb.cache.v1";
const HIT_TTL = 1000 * 60 * 60 * 24 * 7;
const MISS_TTL = 1000 * 60 * 60 * 24;
const MAX_ENTRIES = 1200;
const FLUSH_DELAY = 800;

type CacheEntry = {
  /** Dados do TMDB, ou null quando não houve correspondência. */
  v: Partial<MediaItem> | null;
  /** Timestamp de gravação. */
  t: number;
  /** Último acesso (LRU). */
  a: number;
};

type CacheShape = Record<string, CacheEntry>;

let memory: CacheShape | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

const inflight = new Map<string, Promise<Partial<MediaItem> | null>>();

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(4k|fhd|hd|sd|h265|hevc|dublado|legendado|leg|dub)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tmdbCacheKey(title: string, year: number | undefined, kind: "movie" | "series") {
  return `${kind}|${normalize(title)}|${year || ""}`;
}

function load(): CacheShape {
  if (memory) return memory;
  if (typeof window === "undefined") {
    memory = {};
    return memory;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as CacheShape) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function scheduleFlush() {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
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
      // Cota cheia: descarta a metade menos usada e tenta de novo.
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

export function readTmdbCache(key: string): { value: Partial<MediaItem> | null } | undefined {
  const cache = load();
  const entry = cache[key];
  if (!entry) return undefined;
  const ttl = entry.v ? HIT_TTL : MISS_TTL;
  if (Date.now() - entry.t > ttl) {
    delete cache[key];
    dirty = true;
    scheduleFlush();
    return undefined;
  }
  entry.a = Date.now();
  dirty = true;
  scheduleFlush();
  return { value: entry.v };
}

export function writeTmdbCache(key: string, value: Partial<MediaItem> | null) {
  const cache = load();
  const now = Date.now();
  cache[key] = { v: value, t: now, a: now };
  dirty = true;
  scheduleFlush();
}

export function clearTmdbCache() {
  memory = {};
  inflight.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignora */
    }
  }
}

export function tmdbCacheStats() {
  const cache = load();
  const keys = Object.keys(cache);
  return {
    total: keys.length,
    hits: keys.filter((k) => cache[k].v).length,
  };
}

/**
 * Fila de rede com limite de simultaneidade.
 * Sem isso, uma tela com 60 cards dispara 60 buscas ao mesmo tempo; o navegador
 * da TV enfileira tudo e as imagens/dados demoram muito mais para aparecer.
 */
const MAX_PARALLEL = 4;
let active = 0;
const waiting: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_PARALLEL) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else active -= 1;
}

/** Deduplica chamadas simultâneas para o mesmo título e serve do cache quando possível. */
export async function resolveTmdb(
  key: string,
  fetcher: () => Promise<Partial<MediaItem> | null>,
): Promise<Partial<MediaItem> | null> {
  const cached = readTmdbCache(key);
  if (cached) return cached.value;

  const running = inflight.get(key);
  if (running) return running;

  const promise = (async () => {
    await acquire();
    try {
      const result = await fetcher();
      writeTmdbCache(key, result ?? null);
      return result ?? null;
    } finally {
      release();
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

