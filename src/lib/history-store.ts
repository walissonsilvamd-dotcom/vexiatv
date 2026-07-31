import { useCallback, useSyncExternalStore } from "react";
import { normalizeName } from "./favorites-store";

/**
 * Histórico de reprodução / Continuar Assistindo.
 * Tudo é salvo localmente no aparelho (localStorage) — funciona offline,
 * sem TMDB e sobrevive à atualização da lista M3U/HLS/Xtream.
 */
export type WatchKind = "movie" | "series" | "channel";

export type WatchEntry = {
  /** Chave estável: tipo + nome normalizado (não muda ao trocar de lista). */
  key: string;
  kind: WatchKind;
  id: string;
  tvgId?: string;
  name: string;
  poster?: string;
  url?: string;
  category?: string;
  /* Séries */
  season?: number;
  episode?: number;
  episodeId?: string;
  episodeName?: string;
  /* Progresso (VOD) */
  positionSec: number;
  durationSec: number;
  percent: number;
  completed: boolean;
  updatedAt: number;
};

const KEY = "vexia:watch-history";
const MAX_ITEMS = 200;
const KEEP_DAYS = 30;
const EMPTY: WatchEntry[] = [];

let cache: WatchEntry[] | null = null;
const listeners = new Set<() => void>();

export function historyKey(kind: WatchKind, name: string) {
  return `${kind}:${normalizeName(name) || name.toLowerCase()}`;
}

function prune(list: WatchEntry[]) {
  const limit = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  return list
    .filter((e) => !(e.completed && e.updatedAt < limit))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ITEMS);
}

function read(): WatchEntry[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? prune(JSON.parse(raw) as WatchEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(list: WatchEntry[]) {
  cache = prune(list);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* armazenamento cheio */
  }
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type WatchInput = Omit<WatchEntry, "key" | "updatedAt" | "percent" | "completed"> & {
  percent?: number;
  completed?: boolean;
};

/** Registra (ou atualiza) um conteúdo no histórico. */
export function recordWatch(input: WatchInput) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("vexia:history-off") === "1") return;
  const key = historyKey(input.kind, input.name || input.id);
  const percent =
    input.percent ??
    (input.durationSec > 0 ? (input.positionSec / input.durationSec) * 100 : 0);
  const entry: WatchEntry = {
    ...input,
    key,
    percent: Math.max(0, Math.min(100, percent)),
    completed: input.completed ?? percent >= 95,
    updatedAt: Date.now(),
  };
  const previous = read().find((e) => e.key === key);
  persist([
    { ...previous, ...entry, poster: entry.poster ?? previous?.poster },
    ...read().filter((e) => e.key !== key),
  ]);
}

/** Marca um conteúdo como assistido até o fim. */
export function completeWatch(kind: WatchKind, name: string) {
  const key = historyKey(kind, name);
  const list = read();
  const found = list.find((e) => e.key === key);
  if (!found) return;
  persist(
    list.map((e) =>
      e.key === key
        ? { ...e, percent: 100, completed: true, positionSec: e.durationSec, updatedAt: Date.now() }
        : e,
    ),
  );
}

export function getWatch(kind: WatchKind, name: string): WatchEntry | undefined {
  return read().find((e) => e.key === historyKey(kind, name));
}

export function removeWatch(key: string) {
  persist(read().filter((e) => e.key !== key));
}

export function clearWatchHistory(kind?: WatchKind) {
  persist(kind ? read().filter((e) => e.kind !== kind) : []);
}

/** Remove somente os itens já assistidos até o fim. */
export function clearCompleted() {
  persist(read().filter((e) => !e.completed));
}

export function setHistoryEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) window.localStorage.removeItem("vexia:history-off");
  else window.localStorage.setItem("vexia:history-off", "1");
  for (const fn of listeners) fn();
}

export function isHistoryEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("vexia:history-off") !== "1";
}

/** Hook reativo com todo o histórico (mais recente primeiro). */
export function useWatchHistory() {
  const history = useSyncExternalStore(subscribe, read, () => EMPTY);
  const remove = useCallback((key: string) => removeWatch(key), []);
  const clear = useCallback((kind?: WatchKind) => clearWatchHistory(kind), []);
  return { history, remove, clear };
}

/** Itens em andamento para a seção "Continuar Assistindo". */
export function useContinueWatching(limit = 15) {
  const { history } = useWatchHistory();
  return history
    // Mesma faixa usada pela retomada do player: > 2% e < 95%.
    .filter((e) => e.kind === "channel" || (e.percent > 2 && e.percent < 95))
    .slice(0, limit);
}

/** Formata segundos em HH:MM:SS (ou MM:SS). */
export function formatDuration(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type Matchable = {
  id: string;
  name?: string;
  title?: string;
  url?: string;
  streamUrl?: string;
  tvgId?: string;
  poster?: string;
  logo?: string;
};

/**
 * Matching inteligente após atualizar a lista:
 * 1) id / tvg-id  2) url do stream  3) nome normalizado.
 */
export function matchWatch<T extends Matchable>(entry: WatchEntry, pool: T[]): T | undefined {
  const byId = pool.find(
    (x) => x.id === entry.id || (!!entry.tvgId && !!x.tvgId && x.tvgId === entry.tvgId),
  );
  if (byId) return byId;
  if (entry.url) {
    const byUrl = pool.find((x) => (x.url ?? x.streamUrl) === entry.url);
    if (byUrl) return byUrl;
  }
  const target = normalizeName(entry.name);
  return pool.find((x) => normalizeName(x.name ?? x.title ?? "") === target);
}
