/**
 * Armazenamento assíncrono em IndexedDB para dados grandes (listas M3U/Xtream).
 * O localStorage tem cota de ~5MB e é síncrono — insuficiente para listas reais
 * com dezenas de milhares de itens.
 */
const DB_NAME = "vexia-db";
const DB_VERSION = 1;
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB indisponível"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = run(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("Falha no IndexedDB"));
      }),
  );
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const value = await tx<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
    return value ?? null;
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    await tx("readwrite", (s) => s.put(value, key) as IDBRequest<unknown>);
    return true;
  } catch {
    return false;
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
  } catch {
    /* nada a remover */
  }
}
