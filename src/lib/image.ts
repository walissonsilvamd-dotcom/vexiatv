/**
 * Qualidade máxima de imagem (posters / backdrops).
 *
 * Regra do VÉXIA TV: a imagem exibida é SEMPRE a melhor disponível para a tela.
 * Nunca servimos versões pequenas/pixeladas no conteúdo principal.
 *
 *   TV 4K      -> poster w780 / backdrop original
 *   TV HD/FHD  -> poster w780 / backdrop w1280
 *   Celular    -> poster w500 / backdrop w780
 *
 * A economia continua existindo só onde não é visível: a prévia borrada (LQIP),
 * que é substituída pela imagem em alta assim que ela termina de baixar.
 */

export type ImageRole = "poster" | "backdrop" | "logo" | "still";

const POSTER_SIZES = ["w342", "w500", "w780", "original"] as const;
const BACKDROP_SIZES = ["w780", "w1280", "original"] as const;
/** Largura nominal usada no srcSet para o tamanho "original". */
const ORIGINAL_WIDTH = 2000;

const TMDB_HOST = "image.tmdb.org";

/** Densidade/largura da tela em px CSS (SSR usa TV HD como padrão seguro). */
function screenWidth(): number {
  if (typeof window === "undefined") return 1280;
  return Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2));
}

function pickPosterSize(width = screenWidth()): string {
  if (width >= 2400) return "original";
  if (width >= 900) return "w780";
  return "w500";
}

function pickBackdropSize(width = screenWidth()): string {
  if (width >= 1900) return "original";
  if (width >= 1200) return "w1280";
  return "w780";
}

/** Logos e miniaturas de cena: nítidas mesmo em telas grandes. */
function pickSmallSize(width = screenWidth()): string {
  return width >= 1500 ? "w780" : "w500";
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
  const size =
    role === "backdrop"
      ? pickBackdropSize()
      : role === "logo" || role === "still"
        ? pickSmallSize()
        : pickPosterSize();
  return replaceSize(url, size);
}

/** srcSet com variações para o navegador escolher a melhor densidade. */
export function adaptiveSrcSet(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url || !isTmdbImage(url)) return undefined;
  const sizes = role === "backdrop" ? BACKDROP_SIZES : POSTER_SIZES;
  return sizes
    .map((size) => {
      const width = size === "original" ? ORIGINAL_WIDTH : Number(size.slice(1));
      return `${replaceSize(url, size)} ${width}w`;
    })
    .join(", ");
}

/** Dica de largura renderizada, usada junto com o srcSet. */
export function adaptiveSizes(role: ImageRole = "poster"): string {
  return role === "backdrop"
    ? "100vw"
    : "(min-width: 1600px) 16vw, (min-width: 1024px) 20vw, 32vw";
}

/* ────────────────────────────────────────────────────────────────
 * Carregamento progressivo (LQIP) e pré-carregamento
 * ──────────────────────────────────────────────────────────────── */

/** Miniatura minúscula usada como "prévia borrada" enquanto a real carrega. */
export function placeholderImage(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url || !isTmdbImage(url)) return undefined;
  return replaceSize(url, role === "backdrop" ? "w300" : "w154");
}

/**
 * URL "estável" (não depende do tamanho da tela) usada no atributo `src`.
 * Evita diferença entre servidor e navegador; o `srcSet` continua deixando o
 * navegador escolher a melhor resolução real.
 */
export function stableImage(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url) return undefined;
  if (!isTmdbImage(url)) return url;
  // Sempre a melhor versão estável: nada de imagem "de baixo visual".
  const size = role === "backdrop" ? "w1280" : role === "logo" || role === "still" ? "w780" : "w780";
  return replaceSize(url, size);
}

const preloaded = new Set<string>();

/**
 * Baixa (e decodifica) uma imagem em segundo plano, sem bloquear a interface.
 * Evita a "piscada" e o travamento ao trocar de slide/card na TV.
 */
export function preloadImage(url?: string | null, role: ImageRole = "poster"): void {
  if (typeof window === "undefined") return;
  const target = adaptiveImage(url, role);
  if (!target || preloaded.has(target)) return;
  preloaded.add(target);
  const img = new Image();
  img.decoding = "async";
  img.src = target;
  void img.decode?.().catch(() => {});
}

/** Pré-carrega uma lista curta de imagens (ex.: primeiras linhas de um grid). */
export function preloadImages(urls: (string | null | undefined)[], role: ImageRole = "poster"): void {
  for (const url of urls.slice(0, 12)) preloadImage(url, role);
}
