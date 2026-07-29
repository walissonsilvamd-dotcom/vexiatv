/**
 * IDs estáveis e determinísticos: derivados do conteúdo (nome + grupo + url),
 * nunca da posição no arquivo. Assim favoritos, histórico e progresso
 * continuam válidos quando a lista muda de ordem ou é atualizada.
 */

/** FNV-1a com dois acumuladores de 32 bits (rápido, síncrono e sem colisões práticas). */
export function fnv1a(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ c, 0x85ebca6b) + i) >>> 0;
  }
  return h1.toString(36).padStart(7, "0") + h2.toString(36).padStart(7, "0");
}

export function stableId(prefix: string, ...parts: (string | number | undefined)[]) {
  return `${prefix}-${fnv1a(parts.filter((p) => p !== undefined && p !== "").join("|").toLowerCase())}`;
}

/** Slug usado pelos IDs antigos — mantido para compatibilidade retroativa. */
export function legacySlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compatibilidade retroativa: IDs antigos eram `m3u-<tipo>-<slug>[-<index>]`.
 * Permite reencontrar o item por slug do título quando o hash não bate.
 */
export function matchesLegacyId(legacyId: string, title: string) {
  if (!legacyId.startsWith("m3u-")) return false;
  const body = legacyId.replace(/^m3u-(mv|sr|ch)-/, "").replace(/-\d+$/, "");
  return !!body && body === legacySlug(title);
}
