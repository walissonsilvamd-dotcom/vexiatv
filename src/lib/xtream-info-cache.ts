/**
 * Cache persistente das respostas de detalhe do painel Xtream
 * (`get_series_info` / `get_vod_info`).
 *
 * O APK base guarda essas respostas em banco local e por isso abrir a mesma
 * série duas vezes é instantâneo. Aqui fazemos o mesmo: guardamos o resultado
 * já normalizado no localStorage com TTL, além de deduplicar chamadas em voo
 * (dois focos rápidos no mesmo card = uma única requisição).
 */

const STORAGE_KEY = "vexia.xtream.info.v1";
const TTL = 1000 * 60 * 60 * 12;
const MAX_ENTRIES = 300;
const FLUSH_DELAY = 800;

type Entry<T> = { v: T; t: number };
type Shape = Record<string, Entry<unknown>>;

let memory: Shape | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

const inflight = new Map<string, Promise<unknown>>();

function load(): Shape {
  if (memory) return memory;
  if (typeof window === "undefined") {
    memory = {};
    return memory;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as Shape) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function scheduleFlush() {
  if (typeof window === "undefined" || timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (!dirty || !memory) return;
    dirty = false;
    try {
      const entries = Object.entries(memory)
        .sort((a, b) => b[1].t - a[1].t)
        .slice(0, MAX_ENTRIES);
      memory = Object.fromEntries(entries);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      /* cota cheia: o cache em memória continua valendo nesta sessão */
    }
  }, FLUSH_DELAY);
}

export function readInfoCache<T>(key: string): T | null {
  const store = load();
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.t > TTL) {
    delete store[key];
    dirty = true;
    scheduleFlush();
    return null;
  }
  return entry.v as T;
}

export function writeInfoCache<T>(key: string, value: T) {
  const store = load();
  store[key] = { v: value, t: Date.now() };
  dirty = true;
  scheduleFlush();
}

/**
 * Executa `fetcher` uma única vez por chave: devolve o valor do cache quando
 * existir, reaproveita a chamada em voo e persiste o resultado.
 */
export function cachedInfo<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = readInfoCache<T>(key);
  if (cached !== null) return Promise.resolve(cached);

  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = fetcher()
    .then((value) => {
      writeInfoCache(key, value);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}
