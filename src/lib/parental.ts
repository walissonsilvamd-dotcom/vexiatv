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
const listeners = new Set<() => void>();
let unlocked = false;

function emit() {
  for (const fn of listeners) fn();
}

function readUnlocked() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

/** Libera o conteúdo adulto pela sessão atual quando o PIN confere. */
export function unlockParental(pin: string, savedPin: string) {
  if (!savedPin || pin !== savedPin) return false;
  unlocked = true;
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* armazenamento indisponível */
  }
  emit();
  return true;
}

export function lockParental() {
  unlocked = false;
  try {
    window.sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* armazenamento indisponível */
  }
  emit();
}

export function useParentalUnlocked() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => {
      if (!unlocked) unlocked = readUnlocked();
      return unlocked;
    },
    () => false,
  );
}
