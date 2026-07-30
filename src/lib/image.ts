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

/* ────────────────────────────────────────────────────────────────
 * Detecção de resolução / densidade da tela (DPI)
 * ──────────────────────────────────────────────────────────────── */

export type DisplayTier = "mobile" | "hd" | "fhd" | "uhd";

export type DisplayProfile = {
  /** Largura da janela em px CSS. */
  cssWidth: number;
  /** Densidade de pixels reais por px CSS (limitada a 3 para não exagerar). */
  dpr: number;
  /** Largura em pixels FÍSICOS — é o que define a nitidez real. */
  deviceWidth: number;
  tier: DisplayTier;
};

/** Perfil padrão usado no servidor (TV Full HD: escolha segura e nítida). */
const SSR_PROFILE: DisplayProfile = { cssWidth: 1280, dpr: 1, deviceWidth: 1280, tier: "fhd" };

function measureDisplay(): DisplayProfile {
  if (typeof window === "undefined") return SSR_PROFILE;
  const cssWidth = window.innerWidth || 1280;
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
  const deviceWidth = Math.round(cssWidth * dpr);
  const tier: DisplayTier =
    deviceWidth >= 2400 ? "uhd" : deviceWidth >= 1700 ? "fhd" : deviceWidth >= 1100 ? "hd" : "mobile";
  return { cssWidth, dpr, deviceWidth, tier };
}

let profile: DisplayProfile = measureDisplay();
const displayListeners = new Set<(p: DisplayProfile) => void>();

function refreshDisplay() {
  const next = measureDisplay();
  if (
    next.cssWidth === profile.cssWidth &&
    next.dpr === profile.dpr &&
    next.tier === profile.tier
  )
    return;
  profile = next;
  displayListeners.forEach((listener) => listener(profile));
}

if (typeof window !== "undefined") {
  window.addEventListener("resize", refreshDisplay, { passive: true });
  window.addEventListener("orientationchange", refreshDisplay, { passive: true });
  // Mudança de densidade (troca de monitor / zoom / TV alternando 1080p↔4K).
  const dprQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  dprQuery?.addEventListener?.("change", refreshDisplay);
}

/** Perfil atual da tela (resolução + densidade). */
export function getDisplayProfile(): DisplayProfile {
  return profile;
}

/** Avisa quando a resolução/densidade muda; devolve a função para cancelar. */
export function subscribeDisplay(listener: (p: DisplayProfile) => void): () => void {
  displayListeners.add(listener);
  return () => displayListeners.delete(listener);
}

/** Densidade/largura da tela em px físicos (SSR usa TV HD como padrão seguro). */
function screenWidth(): number {
  return profile.deviceWidth;
}

/**
 * Escolhe o menor tamanho TMDB que ainda cobre a largura pedida em pixels
 * FÍSICOS. Como nunca escolhemos um arquivo menor que o espaço desenhado, a
 * imagem nunca é ampliada — ou seja, nunca borra.
 */
export function sizeForWidth(neededPhysicalWidth: number, role: ImageRole = "poster"): string {
  const sizes: readonly string[] = role === "backdrop" ? BACKDROP_SIZES : POSTER_SIZES;
  for (const size of sizes) {
    const width = size === "original" ? ORIGINAL_WIDTH : Number(size.slice(1));
    if (width >= neededPhysicalWidth) return size;
  }
  return "original";
}

function pickPosterSize(width = screenWidth()): string {
  // Um pôster ocupa ~1/5 da largura da tela nos grids da TV.
  return sizeForWidth(Math.max(500, Math.round(width / 5)), "poster");
}

function pickBackdropSize(width = screenWidth()): string {
  return sizeForWidth(width, "backdrop");
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

/**
 * Tamanho ideal para um elemento já medido na tela.
 * Recebe a largura em px CSS e converte para pixels físicos usando o DPI real,
 * garantindo o arquivo mais leve que ainda fica 100% nítido.
 */
export function exactImage(
  url: string | null | undefined,
  role: ImageRole,
  renderedCssWidth: number,
): string | undefined {
  if (!url) return undefined;
  if (!isTmdbImage(url) || !renderedCssWidth) return url ?? undefined;
  const needed = Math.round(renderedCssWidth * profile.dpr);
  return replaceSize(url, sizeForWidth(needed, role));
}

/** `sizes` exato em px para um elemento medido — evita o navegador "chutar". */
export function exactSizes(renderedCssWidth: number): string {
  return `${Math.max(1, Math.round(renderedCssWidth))}px`;
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

/** Fila de pré-carregamento: baixa em paralelo controlado, sem travar a TV. */
const queue: { url: string; priority: number }[] = [];
let running = 0;
const MAX_PARALLEL = 4;

function idle(run: () => void) {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => void })
    .requestIdleCallback;
  if (ric) ric(run, { timeout: 800 });
  else setTimeout(run, 32);
}

function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    queue.sort((a, b) => a.priority - b.priority);
    const next = queue.shift();
    if (!next) return;
    running += 1;
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    const done = () => {
      running -= 1;
      if (queue.length) idle(pump);
    };
    img.onload = () => {
      void img.decode?.().catch(() => {});
      done();
    };
    img.onerror = done;
    img.src = next.url;
  }
}

/**
 * Baixa (e decodifica) uma imagem em segundo plano, sem bloquear a interface.
 * A cópia fica no cache persistente (service worker), então nas próximas
 * aberturas ela aparece instantaneamente e sempre em alta qualidade.
 */
export function preloadImage(url?: string | null, role: ImageRole = "poster", priority = 1): void {
  if (typeof window === "undefined") return;
  const target = adaptiveImage(url, role);
  if (!target || preloaded.has(target)) return;
  preloaded.add(target);
  queue.push({ url: target, priority });
  idle(pump);
}

/**
 * Pré-carrega uma lista de imagens (ex.: primeiras linhas de um grid).
 * As primeiras entram pela fila do navegador (uso imediato) e o restante é
 * entregue ao cache persistente para baixar em segundo plano.
 */
export function preloadImages(
  urls: (string | null | undefined)[],
  role: ImageRole = "poster",
): void {
  if (typeof window === "undefined") return;
  const list = urls.filter(Boolean) as string[];
  list.slice(0, 12).forEach((url, index) => preloadImage(url, role, index));

  const background = list
    .slice(12, 60)
    .map((url) => adaptiveImage(url, role))
    .filter((url): url is string => !!url && !preloaded.has(url));
  if (background.length) {
    background.forEach((url) => preloaded.add(url));
    void import("./image-cache").then(({ prefetchThroughCache }) =>
      prefetchThroughCache(background),
    );
  }
}


/* ────────────────────────────────────────────────────────────────
 * Otimização automática (upscale inteligente + nitidez + ruído)
 * ──────────────────────────────────────────────────────────────── */

/** Sobe para o próximo tamanho TMDB disponível (ou undefined se já é o maior). */
export function upgradeTmdbSize(url?: string | null, role: ImageRole = "poster"): string | undefined {
  if (!url || !isTmdbImage(url)) return undefined;
  const sizes: readonly string[] = role === "backdrop" ? BACKDROP_SIZES : POSTER_SIZES;
  const current = /\/t\/p\/([^/]+)\//.exec(url)?.[1];
  const index = current ? sizes.indexOf(current) : -1;
  if (index < 0 || index >= sizes.length - 1) return undefined;
  return replaceSize(url, sizes[index + 1]);
}

export type EnhanceLevel = "none" | "soft" | "medium" | "strong";

/**
 * Decide o quanto a imagem precisa ser "melhorada" comparando a resolução real
 * do arquivo com o tamanho em que ela está sendo desenhada na tela.
 *
 *  ratio >= 1   -> imagem sobra em resolução: nada a fazer.
 *  ratio < 1    -> está sendo ampliada: aplicamos nitidez/limpeza proporcional.
 */
export function enhanceLevel(naturalWidth: number, renderedWidth: number): EnhanceLevel {
  if (!naturalWidth || !renderedWidth) return "none";
  const ratio = naturalWidth / renderedWidth;
  if (ratio >= 1.15) return "none";
  if (ratio >= 0.85) return "soft";
  if (ratio >= 0.55) return "medium";
  return "strong";
}
