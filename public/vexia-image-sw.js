/* VÉXIA TV — cache persistente e inteligente de imagens (posters / backdrops).
 *
 * - Cache-first: a imagem só é baixada uma vez; nas próximas aberturas o app
 *   mostra tudo instantaneamente, mesmo sem internet.
 * - Persistente: o Cache API sobrevive ao fechamento do app/TV.
 * - LRU real: cada acerto "renova" a imagem, então o que você mais vê nunca é
 *   descartado; só o conteúdo antigo é removido quando o limite é atingido.
 * - Pré-carregamento: o app manda uma lista de URLs (mensagem VEXIA_PREFETCH)
 *   e o service worker baixa em segundo plano, sem travar a interface.
 */
const CACHE = "vexia-images-v2";
const MAX_ENTRIES = 1200;
const PREFETCH_CONCURRENCY = 4;

self.addEventListener("install", () => {
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

/** Reinsere a entrada no fim da fila do cache = política LRU. */
async function touch(cache, request, response) {
  try {
    await cache.delete(request);
    await cache.put(request, response.clone());
  } catch {
    /* renovar é opcional */
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableImage(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request, { ignoreVary: true });
      if (hit) {
        event.waitUntil(touch(cache, request, hit));
        return hit;
      }
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          event.waitUntil(
            cache
              .put(request, response.clone())
              .then(() => trim(cache))
              .catch(() => {}),
          );
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

/** Baixa em segundo plano as imagens que o app vai mostrar em seguida. */
async function prefetch(urls) {
  const cache = await caches.open(CACHE);
  const queue = urls.filter(Boolean);
  let index = 0;
  async function worker() {
    while (index < queue.length) {
      const url = queue[index++];
      try {
        const request = new Request(url, { mode: "cors", credentials: "omit" });
        const hit = await cache.match(request, { ignoreVary: true });
        if (hit) continue;
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          await cache.put(request, response.clone());
        }
      } catch {
        /* imagem indisponível: ignora e segue */
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(PREFETCH_CONCURRENCY, queue.length) }, worker),
  );
  await trim(cache);
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "VEXIA_PREFETCH" && Array.isArray(data.urls)) {
    event.waitUntil(prefetch(data.urls.slice(0, 60)));
  }
  if (data.type === "VEXIA_CLEAR_IMAGE_CACHE") {
    event.waitUntil(caches.delete(CACHE));
  }
});
