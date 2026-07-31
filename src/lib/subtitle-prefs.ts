/**
 * Preferência de legenda por canal / título.
 *
 * Guarda no aparelho o idioma escolhido à mão para cada conteúdo, para que ao
 * voltar a assistir o player já entre com a mesma faixa. Séries compartilham a
 * escolha entre todos os episódios (a chave ignora o episódio).
 */

const KEY = "vexia:subs:by-item";
const LIMIT = 400;

/** "off" = o usuário desligou a legenda neste conteúdo. */
export type SubtitlePref = string;

type Store = Record<string, SubtitlePref>;

export function subtitleItemKey(type: string, id: string) {
  return `${type}|${id}`;
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

export function getSubtitlePref(itemKey: string): SubtitlePref | null {
  return readStore()[itemKey] ?? null;
}

export function setSubtitlePref(itemKey: string, pref: SubtitlePref) {
  if (typeof localStorage === "undefined" || !itemKey) return;
  try {
    const store = readStore();
    store[itemKey] = pref;

    // Evita crescer sem limite em TVs com pouco armazenamento.
    const keys = Object.keys(store);
    if (keys.length > LIMIT) {
      for (const k of keys.slice(0, keys.length - LIMIT)) delete store[k];
    }
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* armazenamento indisponível */
  }
}
