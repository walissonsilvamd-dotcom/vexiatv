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
  if (width >= 2400) return "w780";
  if (width >= 1500) return "w500";
  if (width >= 900) return "w500";
  return "w342";
}

function pickBackdropSize(width = screenWidth()): string {
  if (width >= 2400) return "w1280";
  if (width >= 1500) return "w1280";
  if (width >= 900) return "w780";
  return "w500";
}

/** Logos e miniaturas de cena não precisam de tamanho grande. */
function pickSmallSize(width = screenWidth()): string {
  return width >= 1500 ? "w500" : "w300";
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
    .map((size) => `${replaceSize(url, size)} ${Number(size.slice(1))}w`)
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
  return replaceSize(url, role === "backdrop" ? "w300" : "w92");
}

/**
 * URL "estável" (não depende do tamanho da tela) usada no atributo `src`.
 * Evita diferença entre servidor e navegador; o `srcSet` continua deixando o
 * navegador escolher a melhor resolução real.
 */
export function stableImage(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url) return undefined;
  if (!isTmdbImage(url)) return url;
  const size = role === "backdrop" ? "w1280" : role === "logo" || role === "still" ? "w300" : "w500";
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
