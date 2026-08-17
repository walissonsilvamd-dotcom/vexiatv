/**
 * Otimização de URL para reprodução imediata.
 */

const PROXY_URL = "/api/public/stream?url=";
const urlCache = new Map<string, string>();

/**
 * Endereço realmente reproduzível de um stream.
 * 
 * Links HTTP em página HTTPS (mixed content) são bloqueados; o proxy resolve
 * isso e a falta de CORS. Usamos cache para evitar re-processamento.
 */
export function playableStreamUrl(src: string): string {
  if (!src) return src;
  const cached = urlCache.get(src);
  if (cached) return cached;

  let result = src;
  if (src.startsWith("http://")) {
    result = `${PROXY_URL}${encodeURIComponent(src)}`;
  }

  if (urlCache.size > 500) urlCache.clear();
  urlCache.set(src, result);
  return result;
}