/* VÉXIA TV — cache inteligente de imagens (posters / backdrops).
 *
 * Estratégia cache-first para imagens remotas: na primeira abertura os posters
 * são baixados e guardados; nas próximas o app carrega instantâneo, mesmo com
 * internet ruim. O cache é limitado para não estourar o armazenamento da TV.
 */
const CACHE = "vexia-images-v1";
const MAX_ENTRIES = 600;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isCacheableImage(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) return false;
  if (request.destination === "image") return true;
  return /\.(png|jpe?g|webp|avif|gif)$/i.test(url.pathname) || url.hostname.includes("image.tmdb.org");
}

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i += 1) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableImage(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreVary: true });
      if (hit) return hit;
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          cache.put(request, response.clone()).then(() => trim(cache)).catch(() => {});
        }
        return response;
      } catch (error) {
        const stale = await cache.match(request, { ignoreVary: true });
        if (stale) return stale;
        throw error;
      }
    })(),
  );
});
