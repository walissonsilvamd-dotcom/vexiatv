/**
 * Cache de manifesto e metadados de canal (zapping instantâneo).
 *
 * Ao passar o foco pela lista, o prefetch guarda aqui o texto do manifesto
 * (master e variante) e o formato descoberto do canal. Quando a prévia abre,
 * o motor HLS lê o manifesto direto da memória — zero ida ao servidor — e o
 * canal aparece na hora. Entradas ao vivo vivem pouco de propósito: manifesto
 * velho faria o player começar em um segmento que já saiu do ar.
 */

/** Tempo de vida do manifesto ao vivo. Curto para nunca servir playlist velha. */
const MANIFEST_TTL_MS = 6_000;
/** Metadados (formato/variante) mudam raramente: podem viver bem mais. */
const META_TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 80;

type ManifestEntry = { text: string; at: number };
type ChannelMeta = {
  /** URL da variante (media playlist) já resolvida a partir do master. */
  variant?: string;
  /** Formato observado: "hls" ou "progressive". */
  kind?: "hls" | "progressive";
  at: number;
};

const manifests = new Map<string, ManifestEntry>();
const metas = new Map<string, ChannelMeta>();

function prune<T>(map: Map<string, T>) {
  if (map.size <= MAX_ENTRIES) return;
  // Map preserva ordem de inserção: descarta as entradas mais antigas.
  const excess = map.size - MAX_ENTRIES;
  let i = 0;
  for (const key of map.keys()) {
    if (i++ >= excess) break;
    map.delete(key);
  }
}

export function putManifest(url: string, text: string) {
  if (!url || !text) return;
  manifests.set(url, { text, at: Date.now() });
  prune(manifests);
}

/** Manifesto ainda fresco para essa URL, ou null. Não remove a entrada. */
export function peekManifest(url: string): string | null {
  const hit = manifests.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > MANIFEST_TTL_MS) {
    manifests.delete(url);
    return null;
  }
  return hit.text;
}

export function putChannelMeta(url: string, meta: Omit<ChannelMeta, "at">) {
  if (!url) return;
  const current = metas.get(url);
  metas.set(url, { ...current, ...meta, at: Date.now() });
  prune(metas);
}

export function getChannelMeta(url: string): Omit<ChannelMeta, "at"> | null {
  const hit = metas.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > META_TTL_MS) {
    metas.delete(url);
    return null;
  }
  const { at: _at, ...rest } = hit;
  return rest;
}

/** Limpa tudo (troca de lista/playlist). */
export function clearManifestCache() {
  manifests.clear();
  metas.clear();
}
