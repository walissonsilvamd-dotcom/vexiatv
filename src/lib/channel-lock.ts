/**
 * Bloqueio por canal (complementa o Controle dos Pais).
 *
 * No APK base é possível trancar canais específicos, não só a categoria adulta.
 * Aqui o cliente marca o canal com um cadeado: a prévia e a tela cheia só
 * abrem depois do PIN, e a liberação vale apenas para a sessão atual.
 */

import { useSyncExternalStore } from "react";

const KEY = "vexia:locked-channels";
const SESSION_KEY = "vexia:locked-unlocked";
const EMPTY: string[] = [];

let cache: string[] | null = null;
let session: Set<string> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(list: string[]) {
  cache = list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* armazenamento cheio */
  }
  emit();
}

function readSession(): Set<string> {
  if (session) return session;
  session = new Set();
  if (typeof window === "undefined") return session;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) session = new Set(JSON.parse(raw) as string[]);
  } catch {
    /* sessão indisponível */
  }
  return session;
}

function persistSession() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify([...readSession()]));
  } catch {
    /* sessão indisponível */
  }
  emit();
}

export function isChannelLocked(id: string) {
  return read().includes(id);
}

/** Marca/desmarca o cadeado do canal. */
export function toggleChannelLock(id: string) {
  const list = read();
  const locked = list.includes(id);
  persist(locked ? list.filter((i) => i !== id) : [...list, id]);
  if (locked) {
    readSession().delete(id);
    persistSession();
  }
  return !locked;
}

/** Libera o canal nesta sessão quando o PIN confere. */
export function unlockChannel(id: string, pin: string, savedPin: string) {
  if (!savedPin || pin !== savedPin) return false;
  readSession().add(id);
  persistSession();
  return true;
}

/** true = precisa de PIN antes de reproduzir. */
export function needsChannelPin(id: string) {
  return isChannelLocked(id) && !readSession().has(id);
}

function snapshot() {
  // Muda de identidade a cada alteração: serve de gatilho para o React.
  return `${read().join(",")}|${[...readSession()].join(",")}`;
}

/** Hook reativo: devolve os checadores já atualizados. */
export function useChannelLocks() {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    snapshot,
    () => "",
  );
  return {
    locked: (id: string) => isChannelLocked(id),
    blocked: (id: string) => needsChannelPin(id),
    all: read() ?? EMPTY,
  };
}
