/**
 * IDs estáveis para itens da lista: derivados do conteúdo (nome + URL),
 * nunca da posição no arquivo. Assim favoritos, histórico e progresso
 * continuam válidos quando a lista muda de ordem ou é recarregada.
 */
export function hashString(input: string): string {
  // FNV-1a 64-bit simulado com dois acumuladores de 32 bits (rápido e sem colisões práticas).
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
  return `${prefix}-${hashString(parts.filter((p) => p !== undefined && p !== "").join("|").toLowerCase())}`;
}
