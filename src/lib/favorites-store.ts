import { useCallback, useSyncExternalStore } from "react";
import type { MediaItem } from "../data/vexia";
import type { PlaylistChannel, PlaylistSeries } from "./m3u";

export type FavoriteKind = "channel" | "movie" | "series";

/**
 * Favorito salvo localmente. Guarda dados suficientes para funcionar
 * offline e sem TMDB: nome, url do stream, tipo, id, categoria e logo.
 */
export type Favorite = {
  key: string;
  kind: FavoriteKind;
  id: string;
  tvgId?: string;
  name: string;
  url?: string;
  category?: string;
  logo?: string;
  rating?: number;
  year?: number;
  addedAt: number;
};

const KEY = "vexia:favorites";
const LEGACY_CHANNELS = "vexia:fav-channels";

/** Normaliza nomes para matching: remove emojis, HD/FHD/4K e acentos. */
export function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\p{Extended_Pictographic}\p{So}]/gu, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\((19|20)\d{2}\)/g, " ")
    .replace(/\b(4K|UHD|FHD|HD|SD|H265|HEVC|1080P|720P|480P|AO VIVO|LIVE)\b/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function favKey(kind: FavoriteKind, name: string) {
  return `${kind}:${normalizeName(name)}`;
}

let cache: Favorite[] | null = null;
const listeners = new Set<() => void>();

function read(): Favorite[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  let list: Favorite[] = [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw) as Favorite[];
  } catch {
    list = [];
  }
  // Migração dos favoritos antigos de canais (somente ids).
  try {
    const legacy = window.localStorage.getItem(LEGACY_CHANNELS);
    if (legacy) {
      const ids = JSON.parse(legacy) as string[];
      for (const id of ids) {
        if (!list.some((f) => f.kind === "channel" && f.id === id)) {
          list.push({
            key: favKey("channel", id),
            kind: "channel",
            id,
            name: id,
            addedAt: Date.now(),
          });
        }
      }
      window.localStorage.removeItem(LEGACY_CHANNELS);
      persist(list);
    }
  } catch {
    /* legado inválido */
  }
  return (cache = list);
}

function persist(list: Favorite[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* armazenamento cheio */
  }
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type FavoriteInput = Omit<Favorite, "key" | "addedAt">;

export function toggleFavorite(input: FavoriteInput) {
  const key = favKey(input.kind, input.name || input.id);
  const list = read();
  const exists = list.some((f) => f.key === key);
  persist(
    exists
      ? list.filter((f) => f.key !== key)
      : [...list, { ...input, key, addedAt: Date.now() }],
  );
  return !exists;
}

export function isFavorite(kind: FavoriteKind, name: string) {
  return read().some((f) => f.key === favKey(kind, name));
}

/** Hook reativo com a lista completa de favoritos. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => [] as Favorite[]);
  const has = useCallback(
    (kind: FavoriteKind, name: string) => favorites.some((f) => f.key === favKey(kind, name)),
    [favorites],
  );
  const toggle = useCallback((input: FavoriteInput) => toggleFavorite(input), []);
  const remove = useCallback(
    (key: string) => persist(read().filter((f) => f.key !== key)),
    [],
  );
  return { favorites, has, toggle, remove };
}

type Matchable = { id: string; name?: string; title?: string; url?: string; streamUrl?: string; tvgId?: string };

/**
 * Matching inteligente após atualização da lista:
 * 1) id/tvg-id  2) url do stream  3) nome normalizado.
 */
export function matchFavorite<T extends Matchable>(fav: Favorite, pool: T[]): T | undefined {
  const byId = pool.find(
    (x) => x.id === fav.id || (!!fav.tvgId && !!x.tvgId && x.tvgId === fav.tvgId),
  );
  if (byId) return byId;
  if (fav.url) {
    const byUrl = pool.find((x) => (x.url ?? x.streamUrl) === fav.url);
    if (byUrl) return byUrl;
  }
  const target = normalizeName(fav.name);
  return pool.find((x) => normalizeName(x.name ?? x.title ?? "") === target);
}

/** Cria a entrada de favorito a partir de um canal da playlist. */
export function channelFavorite(ch: PlaylistChannel): FavoriteInput {
  return {
    kind: "channel",
    id: ch.id,
    name: ch.name,
    url: ch.url,
    category: ch.category,
    logo: ch.logo,
  };
}

/** Cria a entrada de favorito a partir de um filme/série. */
export function mediaFavorite(
  item: MediaItem | PlaylistSeries,
  kind: "movie" | "series",
): FavoriteInput {
  return {
    kind,
    id: item.id,
    name: item.title,
    url: item.streamUrl,
    category: item.genres?.[0],
    logo: item.poster,
    rating: item.rating,
    year: item.year,
  };
}
