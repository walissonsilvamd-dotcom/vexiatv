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
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "VEXIA_PREFETCH", urls: list });
    })
    .catch(() => {});
}

/** Limpa todo o cache de imagens (usado em "limpar dados"). */
export function clearImageCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: "VEXIA_CLEAR_IMAGE_CACHE" });
    })
    .catch(() => {});
}
