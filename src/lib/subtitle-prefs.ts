/**
 * Preferência de legenda por canal / título.
 *
 * Guarda no aparelho o idioma escolhido à mão e o atraso (offset) de cada
 * conteúdo, para que ao voltar a assistir o player já entre com a mesma faixa
 * e a mesma sincronia. Séries compartilham a escolha entre todos os episódios
 * (a chave ignora o episódio).
 */

const KEY = "vexia:subs:by-item";
const LIMIT = 400;

/** "off" = o usuário desligou a legenda neste conteúdo. */
export type SubtitlePref = string;

export type SubtitleEntry = {
  /** Idioma/rótulo escolhido, ou "off". */
  lang: SubtitlePref | null;
  /** Atraso em segundos: positivo atrasa, negativo adianta. */
  offset: number;
};

type StoredEntry = string | { lang?: string | null; offset?: number };
type Store = Record<string, StoredEntry>;

export const SUBTITLE_OFFSET_MIN = -10;
export const SUBTITLE_OFFSET_MAX = 10;
export const SUBTITLE_OFFSET_STEP = 0.25;

export function subtitleItemKey(type: string, id: string) {
  return `${type}|${id}`;
}

export function clampSubtitleOffset(value: number) {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(SUBTITLE_OFFSET_MAX, Math.max(SUBTITLE_OFFSET_MIN, value));
  // Evita ruído de ponto flutuante ao somar passos de 0,25s.
  return Math.round(clamped * 100) / 100;
}

function readStore(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof localStorage === "undefined") return;
  try {
    const keys = Object.keys(store);
    if (keys.length > LIMIT) {
      for (const k of keys.slice(0, keys.length - LIMIT)) delete store[k];
    }
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* armazenamento indisponível */
  }
}

function normalize(entry: StoredEntry | undefined): SubtitleEntry {
  if (typeof entry === "string") return { lang: entry, offset: 0 };
  if (entry && typeof entry === "object") {
    return { lang: entry.lang ?? null, offset: clampSubtitleOffset(entry.offset ?? 0) };
  }
  return { lang: null, offset: 0 };
}

export function getSubtitleEntry(itemKey: string): SubtitleEntry {
  return normalize(readStore()[itemKey]);
}

export function getSubtitlePref(itemKey: string): SubtitlePref | null {
  return getSubtitleEntry(itemKey).lang;
}

export function setSubtitlePref(itemKey: string, pref: SubtitlePref) {
  if (!itemKey) return;
  const store = readStore();
  const current = normalize(store[itemKey]);
  store[itemKey] = { lang: pref, offset: current.offset };
  writeStore(store);
}

export function getSubtitleOffset(itemKey: string): number {
  return getSubtitleEntry(itemKey).offset;
}

export function setSubtitleOffset(itemKey: string, offset: number) {
  if (!itemKey) return;
  const store = readStore();
  const current = normalize(store[itemKey]);
  store[itemKey] = { lang: current.lang, offset: clampSubtitleOffset(offset) };
  writeStore(store);
}
