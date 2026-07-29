/**
 * VexiaDB — banco IndexedDB do aplicativo.
 * Usado para dados grandes (listas M3U/Xtream processadas), que não cabem
 * na cota de ~5MB do localStorage e travariam a UI por serem síncronos.
 */
const DB_NAME = "VexiaDB";
const DB_VERSION = 1;
export const STORE_PLAYLIST = "playlist";

let dbPromise: Promise<IDBDatabase> | null = null;

export function isQuotaError(err: unknown) {
  const name = (err as { name?: string } | null)?.name ?? "";
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

export function idbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!idbAvailable()) return Promise.reject(new Error("IndexedDB indisponível"));
  if (!dbPromise) {
    const p = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PLAYLIST)) db.createObjectStore(STORE_PLAYLIST);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
    }).catch((err: unknown) => {
      dbPromise = null;
      throw err;
    });
    dbPromise = p;
    return p;
  }
  return dbPromise;
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const req = action(transaction.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("Falha no IndexedDB"));
        transaction.onabort = () => reject(transaction.error ?? new Error("Transação abortada"));
      }),
  );
}

export function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  return run<T | undefined>(store, "readonly", (s) => s.get(key));
}

export function idbSet(store: string, key: string, value: unknown): Promise<unknown> {
  return run(store, "readwrite", (s) => s.put(value, key));
}

export function idbDel(store: string, key: string): Promise<unknown> {
  return run(store, "readwrite", (s) => s.delete(key));
}
