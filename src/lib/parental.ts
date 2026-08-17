/**
 * Controle dos Pais.
 *
 * Conteúdo adulto é detectado pelo nome da categoria/título vindo da lista M3U.
 * Quando a proteção está ativa, esses itens somem do catálogo, dos canais e da
 * busca até o cliente digitar o PIN — o desbloqueio vale só para a sessão atual.
 */

import { useSyncExternalStore } from "react";

const ADULT_RE =
  /(\badult\b|adulto|xxx|porn|hentai|er[oó]tic|sexy|\+\s?18|18\s?\+|🔞|for\s?adults|brazzers|playboy|penthouse|hustler|redlight|private\s?(?:tv|spice)?|sextreme|venus\s?xxx)/i;

/** Diz se algum dos textos indica conteúdo adulto. */
export function isAdultText(...parts: (string | undefined | null)[]) {
  return parts.some((part) => (part ? ADULT_RE.test(part) : false));
}

const UNLOCK_KEY = "vexia:parental-unlocked";
const INDIVIDUAL_UNLOCK_KEY = "vexia:individual-unlocked";
const listeners = new Set<() => void>();
let unlocked = false;
let individualUnlocked: Set<string> = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function readUnlocked() {
  if (typeof window === "undefined") return { global: false, individual: new Set<string>() };
  try {
    const global = window.sessionStorage.getItem(UNLOCK_KEY) === "1";
    const indRaw = window.sessionStorage.getItem(INDIVIDUAL_UNLOCK_KEY);
    const individual = new Set<string>(indRaw ? JSON.parse(indRaw) : []);
    return { global, individual };
  } catch {
    return { global: false, individual: new Set<string>() };
  }
}

/** Libera o conteúdo adulto pela sessão atual quando o PIN confere. */
export function unlockParental(pin: string, savedPin: string, itemId?: string) {
  if (!savedPin || pin !== savedPin) return false;
  
  if (itemId) {
    // Desbloqueio individual
    individualUnlocked.add(itemId);
    try {
      window.sessionStorage.setItem(INDIVIDUAL_UNLOCK_KEY, JSON.stringify([...individualUnlocked]));
    } catch {}
  } else {
    // Desbloqueio global
    unlocked = true;
    try {
      window.sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch {}
  }
  
  emit();
  return true;
}

export function lockParental() {
  unlocked = false;
  individualUnlocked.clear();
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
    window.sessionStorage.removeItem(INDIVIDUAL_UNLOCK_KEY);
  } catch {}
  emit();
}

export function useParentalUnlocked(itemId?: string) {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => {
      const state = readUnlocked();
      if (!unlocked) unlocked = state.global;
      if (individualUnlocked.size === 0) individualUnlocked = state.individual;
      
      if (unlocked) return true;
      if (itemId && individualUnlocked.has(itemId)) return true;
      return false;
    },
    () => false,
  );
}
