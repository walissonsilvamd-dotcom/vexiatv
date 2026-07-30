/**
 * Otimização adaptativa de imagens (posters / backdrops).
 *
 * As imagens do TMDB são servidas em vários tamanhos. Em vez de baixar sempre
 * a maior versão, escolhemos o tamanho de acordo com a tela do aparelho:
 *
 *   TV 4K      -> poster w500  / backdrop w1280
 *   TV HD      -> poster w342  / backdrop w780
 *   Celular    -> poster w185  / backdrop w500
 *
 * Isso reduz memória, tempo de carregamento e consumo de internet — o que faz
 * o scroll ficar bem mais suave em TVs simples.
 */

export type ImageRole = "poster" | "backdrop" | "logo" | "still";

const POSTER_SIZES = ["w154", "w185", "w342", "w500", "w780"] as const;
const BACKDROP_SIZES = ["w300", "w500", "w780", "w1280"] as const;

const TMDB_HOST = "image.tmdb.org";

/** Densidade/largura da tela em px CSS (SSR usa TV HD como padrão seguro). */
function screenWidth(): number {
  if (typeof window === "undefined") return 1280;
  return Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2));
}

function pickPosterSize(width = screenWidth()): string {
  if (width >= 2400) return "w500";
  if (width >= 1500) return "w342";
  if (width >= 900) return "w342";
  return "w185";
}

function pickBackdropSize(width = screenWidth()): string {
  if (width >= 2400) return "w1280";
  if (width >= 1500) return "w1280";
  if (width >= 900) return "w780";
  return "w500";
}

/** É uma URL de imagem do TMDB (podemos trocar o tamanho livremente)? */
export function isTmdbImage(url?: string | null): boolean {
  return !!url && url.includes(TMDB_HOST);
}

function replaceSize(url: string, size: string): string {
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${size}/`);
}

/**
 * Devolve a URL da imagem no tamanho ideal para a tela atual.
 * URLs que não são do TMDB voltam sem alteração.
 */
export function adaptiveImage(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url) return undefined;
  if (!isTmdbImage(url)) return url;
  const size = role === "backdrop" ? pickBackdropSize() : pickPosterSize();
  return replaceSize(url, size);
}

/** srcSet com variações para o navegador escolher a melhor densidade. */
export function adaptiveSrcSet(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url || !isTmdbImage(url)) return undefined;
  const sizes = role === "backdrop" ? BACKDROP_SIZES : POSTER_SIZES;
  return sizes
    .map((size) => `${replaceSize(url, size)} ${Number(size.slice(1))}w`)
    .join(", ");
}

/** Dica de largura renderizada, usada junto com o srcSet. */
export function adaptiveSizes(role: ImageRole = "poster"): string {
  return role === "backdrop"
    ? "100vw"
    : "(min-width: 1600px) 16vw, (min-width: 1024px) 20vw, 32vw";
}
