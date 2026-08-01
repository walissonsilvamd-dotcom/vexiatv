/**
 * "Meus Grupos" — listas personalizadas criadas pelo cliente.
 *
 * Recurso do APK base: além das categorias que vêm do painel, o cliente pode
 * montar seus próprios grupos (ex.: "Esportes da família", "Infantil") e
 * colocar dentro os canais que quiser. Fica tudo salvo no aparelho.
 */

import { useCallback, useSyncExternalStore } from "react";

export type ChannelGroup = {
  id: string;
  name: string;
  /** ids dos canais que fazem parte do grupo. */
  items: string[];
  createdAt: number;
};

const KEY = "vexia:my-groups";
const EMPTY: ChannelGroup[] = [];

let cache: ChannelGroup[] | null = null;
const listeners = new Set<() => void>();

function read(): ChannelGroup[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ChannelGroup[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(list: ChannelGroup[]) {
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

export function createGroup(name: string) {
  const clean = name.trim();
  if (!clean) return null;
  const group: ChannelGroup = {
    id: `g${Date.now().toString(36)}`,
    name: clean,
    items: [],
    createdAt: Date.now(),
  };
  persist([...read(), group]);
  return group;
}

export function renameGroup(id: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  persist(read().map((g) => (g.id === id ? { ...g, name: clean } : g)));
}

export function removeGroup(id: string) {
  persist(read().filter((g) => g.id !== id));
}

/** Adiciona ou remove um canal do grupo. Devolve true se ficou dentro. */
export function toggleGroupItem(groupId: string, channelId: string) {
  let inside = false;
  persist(
    read().map((g) => {
      if (g.id !== groupId) return g;
      const has = g.items.includes(channelId);
      inside = !has;
      return {
        ...g,
        items: has ? g.items.filter((i) => i !== channelId) : [...g.items, channelId],
      };
    }),
  );
  return inside;
}

export function groupsOf(channelId: string) {
  return read().filter((g) => g.items.includes(channelId));
}

/** Hook reativo com todos os grupos do cliente. */
export function useGroups() {
  const groups = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback(
    (groupId: string, channelId: string) =>
      groups.find((g) => g.id === groupId)?.items.includes(channelId) ?? false,
    [groups],
  );
  return { groups, has };
}
