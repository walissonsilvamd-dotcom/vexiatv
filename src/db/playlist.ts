import type { ParsedPlaylist } from "../lib/m3u";
import { idbAvailable, idbDel, idbGet, idbSet, isQuotaError, STORE_PLAYLIST } from "./indexeddb";

/** Playlist já processada (canais, filmes, séries) — nunca o texto bruto. */
export type StoredPlaylist = {
  url: string;
  name: string;
  loadedAt: number;
  data: ParsedPlaylist;
};

const KEY = "current";
/** Chave antiga (texto bruto em localStorage) usada para migração. */
const LEGACY_KEY = "vexia:playlist";
const FALLBACK_KEY = "vexia:playlist:parsed";

export class StorageQuotaError extends Error {
  constructor() {
    super("Espaço de armazenamento insuficiente.");
    this.name = "StorageQuotaError";
  }
}

export async function savePlaylist(record: StoredPlaylist): Promise<void> {
  if (idbAvailable()) {
    try {
      await idbSet(STORE_PLAYLIST, KEY, record);
      return;
    } catch (err) {
      console.error("[vexia] falha ao salvar a lista no IndexedDB", err);
      if (isQuotaError(err)) throw new StorageQuotaError();
    }
  }
  // Fallback: localStorage (listas pequenas apenas).
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(record));
  } catch (err) {
    console.error("[vexia] falha ao salvar a lista no localStorage", err);
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

export async function loadPlaylist(): Promise<StoredPlaylist | null> {
  if (idbAvailable()) {
    try {
      const record = await idbGet<StoredPlaylist>(STORE_PLAYLIST, KEY);
      if (record?.data) return record;
    } catch (err) {
      console.error("[vexia] falha ao ler a lista no IndexedDB", err);
    }
  }
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (raw) return JSON.parse(raw) as StoredPlaylist;
  } catch (err) {
    console.error("[vexia] lista inválida no armazenamento local", err);
  }
  return null;
}

export async function clearPlaylist(): Promise<void> {
  if (idbAvailable()) {
    try {
      await idbDel(STORE_PLAYLIST, KEY);
    } catch (err) {
      console.error("[vexia] falha ao limpar a lista", err);
    }
  }
  try {
    window.localStorage.removeItem(FALLBACK_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* nada a remover */
  }
}

/** Texto bruto salvo por versões antigas; devolvido para reprocessamento único. */
export function readLegacyText(): { url: string; name: string; text: string } | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: string; name?: string; text?: string };
    if (!parsed?.text) return null;
    return { url: parsed.url ?? "", name: parsed.name ?? "Minha lista", text: parsed.text };
  } catch {
    return null;
  }
}

export function dropLegacyText() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* nada a remover */
  }
}
