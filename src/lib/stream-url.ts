/**
 * Endereço realmente reproduzível de um stream.
 *
 * Muitas listas IPTV entregam links em `http://`. Como o app roda em `https`,
 * o navegador/WebView bloqueia esse conteúdo misto e o vídeo simplesmente não
 * inicia (sem erro visível). Nesses casos o stream passa pelo proxy do próprio
 * app, que também resolve a falta de CORS de vários servidores.
 */
export function playableStreamUrl(src: string): string {
  if (!src) return src;
  if (src.startsWith("/")) return src;
  if (typeof window === "undefined") return src;
  const insecure = src.startsWith("http://");
  const pageIsSecure = window.location.protocol === "https:";
  if (insecure && pageIsSecure) {
    return `/api/public/stream?url=${encodeURIComponent(src)}`;
  }
  return src;
}
