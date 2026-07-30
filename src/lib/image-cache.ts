/** Registra o cache inteligente de imagens (só no navegador/WebView). */
export function registerImageCache() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
  const register = () => {
    navigator.serviceWorker.register("/vexia-image-sw.js").catch(() => {
      /* cache é opcional: se falhar o app continua normal */
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
