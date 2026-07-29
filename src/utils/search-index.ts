/**
 * Índice de busca em memória para listas M3U grandes (20.000+ itens).
 *
 * O índice é construído uma única vez por lista e reutilizado em todas as
 * consultas: cada entrada guarda o texto já normalizado (sem acentos, sem
 * pontuação, minúsculo), o que torna a busca por múltiplas palavras barata.
 */

export type SearchEntry<T> = {
  id: string;
  item: T;
  /** Nome original, preservado para exibição. */
  name: string;
  /** Nome normalizado — base da comparação. */
  normalized: string;
  category: string;
  genre: string;
  year: string;
  /** Nome + categoria + gênero + ano normalizados, usado no match amplo. */
  haystack: string;
};

export type SearchIndex<T> = {
  entries: SearchEntry<T>[];
};

/** Remove acentos, pontuação e caixa alta para comparações tolerantes. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Divide a consulta em termos normalizados (sem vazios). */
export function tokenize(query: string): string[] {
  const normalized = normalizeText(query);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

type FieldMap<T> = {
  id: (item: T) => string;
  name: (item: T) => string;
  category?: (item: T) => string;
  genre?: (item: T) => string;
  year?: (item: T) => string | number;
};

export function buildSearchIndex<T>(items: readonly T[], fields: FieldMap<T>): SearchIndex<T> {
  const entries: SearchEntry<T>[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name = fields.name(item) ?? "";
    const category = fields.category?.(item) ?? "";
    const genre = fields.genre?.(item) ?? "";
    const yearRaw = fields.year?.(item);
    const year = yearRaw ? String(yearRaw) : "";
    const normalized = normalizeText(name);
    entries[i] = {
      id: fields.id(item),
      item,
      name,
      normalized,
      category,
      genre,
      year,
      haystack: `${normalized} ${normalizeText(category)} ${normalizeText(genre)} ${year}`.trim(),
    };
  }
  return { entries };
}

/**
 * Consulta o índice com suporte a múltiplas palavras.
 * "homem aranha" encontra "HOMEM-ARANHA 4K UHD" mesmo fora de ordem.
 * Resultados saem ordenados por relevância.
 */
export function queryIndex<T>(index: SearchIndex<T>, query: string, limit = 5000): T[] {
  const terms = tokenize(query);
  if (terms.length === 0) return index.entries.map((e) => e.item);

  const phrase = terms.join(" ");
  const scored: { item: T; score: number }[] = [];

  for (const entry of index.entries) {
    let score = 0;
    let allInName = true;
    let allInHaystack = true;

    for (const term of terms) {
      const inName = entry.normalized.includes(term);
      const inHaystack = inName || entry.haystack.includes(term);
      if (!inName) allInName = false;
      if (!inHaystack) allInHaystack = false;
    }

    if (!allInHaystack) continue;

    // Relevância: frase exata > todas as palavras no nome > palavras espalhadas.
    if (entry.normalized === phrase) score += 1000;
    else if (entry.normalized.startsWith(phrase)) score += 600;
    else if (entry.normalized.includes(phrase)) score += 400;
    if (allInName) score += 200;
    // Nomes mais curtos tendem a ser o título procurado.
    score += Math.max(0, 60 - entry.normalized.length / 4);

    scored.push({ item: entry.item, score });
    if (scored.length >= limit * 4) break;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
