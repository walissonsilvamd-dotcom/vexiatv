/** Chave onde guardamos as últimas imagens vistas (aquecimento na abertura). */
const WARM_KEY = "vexia:warm-images";
const WARM_LIMIT = 200;

/** Registra o cache persistente de imagens (só no navegador/WebView). */
export function registerImageCache() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

  const register = () => {
    navigator.serviceWorker.register("/vexia-image-sw.js").catch(() => {
      /* cache é opcional: se falhar o app continua normal */
    });
    // Pede ao sistema para não apagar o cache quando o armazenamento apertar.
    navigator.storage?.persist?.().catch(() => {});
  };

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/** Manda o service worker baixar imagens em segundo plano (pré-carregamento). */
export function prefetchThroughCache(urls: string[]) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const list = urls.filter(Boolean);
  if (!list.length) return;
  rememberWarm(list);
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "VEXIA_PREFETCH", urls: list });
    })
    .catch(() => {});
}

/**
 * Guarda as imagens mais recentes para que, na próxima abertura do app, elas
 * já estejam prontas no cache antes mesmo de a tela pedir por elas.
 */
export function rememberWarm(urls: string[]) {
  if (typeof localStorage === "undefined") return;
  try {
    const previous: string[] = JSON.parse(localStorage.getItem(WARM_KEY) ?? "[]");
    const merged = Array.from(new Set([...urls, ...previous])).slice(0, WARM_LIMIT);
    localStorage.setItem(WARM_KEY, JSON.stringify(merged));
  } catch {
    /* armazenamento cheio/indisponível: aquecimento é opcional */
  }
}

/**
 * Aquecimento na abertura: reenvia ao service worker as imagens da última
 * sessão. O que já está no cache é ignorado (custo zero) e o que faltar é
 * baixado em segundo plano, então a Home aparece instantânea e em alta.
 */
export function warmStartCache() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let urls: string[] = [];
  try {
    urls = JSON.parse(localStorage.getItem(WARM_KEY) ?? "[]");
  } catch {
    return;
  }
  if (!Array.isArray(urls) || !urls.length) return;
  const send = () =>
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.active?.postMessage({ type: "VEXIA_PREFETCH", urls: urls.slice(0, WARM_LIMIT) });
      })
      .catch(() => {});
  // Espera a interface assentar para não competir com o carregamento da tela.
  if ("requestIdleCallback" in window)
    (window as unknown as { requestIdleCallback: (cb: () => void, o?: object) => void })
      .requestIdleCallback(send, { timeout: 4000 });
  else setTimeout(send, 2500);
}

/** Limpa todo o cache de imagens (usado em "limpar dados"). */
export function clearImageCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    localStorage.removeItem(WARM_KEY);
  } catch {
    /* ignora */
  }
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "VEXIA_CLEAR_IMAGE_CACHE" });
    })
    .catch(() => {});
}
