/**
 * Nome e bandeira do país de origem a partir do código ISO 3166-1 que vem do TMDB.
 * Usado na ficha de filmes e séries, ao lado da nota e dos gêneros.
 */

const MANUAL: Record<string, string> = {
  US: "EUA",
  GB: "Reino Unido",
  UK: "Reino Unido",
  BR: "Brasil",
  KR: "Coreia do Sul",
  SU: "União Soviética",
  XK: "Kosovo",
};

/** Converte "BR" em "🇧🇷". */
export function countryFlag(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0)));
}

/** Converte "BR" em "Brasil" (nome traduzido quando o runtime suportar). */
export function countryName(code: string, locale = "pt-BR"): string {
  const cc = code.trim().toUpperCase();
  if (MANUAL[cc]) return MANUAL[cc];
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    return dn.of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/** "🇧🇷 Brasil" — rótulo curto pronto para exibir. */
export function countryLabel(code: string, locale = "pt-BR"): string {
  const flag = countryFlag(code);
  const name = countryName(code, locale);
  return flag ? `${flag} ${name}` : name;
}

/** Junta os países de origem em um rótulo compacto (no máximo 2 + contador). */
export function countriesLabel(codes: string[] | undefined, locale = "pt-BR"): string {
  const list = (codes ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  const unique = Array.from(new Set(list));
  if (!unique.length) return "";
  const shown = unique.slice(0, 2).map((c) => countryLabel(c, locale));
  const rest = unique.length - shown.length;
  return rest > 0 ? `${shown.join(" / ")} +${rest}` : shown.join(" / ");
}
