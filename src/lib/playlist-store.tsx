import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { parsePlaylistText, type ParsedPlaylist, type PlaylistChannel, type PlaylistSeries } from "./m3u";
import { fetchPlaylist } from "./playlist.functions";
import {
  clearPlaylist,
  dropLegacyText,
  loadPlaylist,
  readLegacyText,
  savePlaylist,
  StorageQuotaError,
  type StoredPlaylist,
} from "../db/playlist";
import type { ParseWorkerResponse } from "../workers/parse.worker";
import { StorageErrorDialog } from "../components/StorageErrorDialog";
import { matchesLegacyId } from "../utils/hash";
import type { MediaItem } from "../data/vexia";

/** Etapas reais do processamento da lista, na ordem de execução. */
export const PLAYLIST_STAGES = [
  "Conectando ao servidor",
  "Validando lista",
  "Baixando informações",
  "Criando categorias",
  "Carregando canais",
  "Organizando filmes",
  "Organizando séries",
  "Finalizando",
] as const;

export type PlaylistCounts = { channels: number; movies: number; series: number };

export type PlaylistLoadEvent = {
  /** Índice da etapa em andamento (0-based) em PLAYLIST_STAGES. */
  stage: number;
  /** Progresso real dentro da etapa (0..1), quando disponível. */
  ratio?: number;
  counts?: Partial<PlaylistCounts>;
};

type PlaylistContextValue = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  source: { url: string; name: string; loadedAt: number } | null;
  data: ParsedPlaylist | null;
  hasContent: boolean;
  movies: MediaItem[];
  series: PlaylistSeries[];
  channels: PlaylistChannel[];
  loadFromUrl: (
    url: string,
    name?: string,
    onEvent?: (event: PlaylistLoadEvent) => void,
  ) => Promise<boolean>;
  loadFromText: (text: string, name?: string) => Promise<boolean>;
  reload: () => Promise<boolean>;
  clear: () => void;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

/** Processa a lista em um Web Worker (fora da thread de UI). Cai para a main thread se indisponível. */
function parseInWorker(
  text: string,
  onEvent?: (event: PlaylistLoadEvent) => void,
): Promise<ParsedPlaylist> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(parsePlaylistText(text));
  }
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../workers/parse.worker.ts", import.meta.url), { type: "module" });
    } catch (err) {
      console.error("[vexia] Web Worker indisponível, processando na thread principal", err);
      resolve(parsePlaylistText(text));
      return;
    }
    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
      const msg = event.data;
      if (msg.type === "stage") {
        onEvent?.({ stage: msg.stage, counts: msg.counts });
      } else if (msg.type === "progress") {
        onEvent?.({ stage: msg.stage, ratio: msg.ratio });
      } else if (msg.type === "done") {
        worker.terminate();
        resolve(msg.data);
      } else {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      console.error("[vexia] erro no worker de parse", err);
      try {
        resolve(parsePlaylistText(text));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Falha ao processar a lista."));
      }
    };
    worker.postMessage({ text });
  });
}

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredPlaylist | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  /* Carrega a lista já processada do IndexedDB — sem re-parse a cada abertura. */
  useEffect(() => {
    let alive = true;
    (async () => {
      let record = await loadPlaylist();
      if (!record) {
        // Migração única de versões antigas que guardavam o texto bruto.
        const legacy = readLegacyText();
        if (legacy) {
          try {
            const data = await parseInWorker(legacy.text);
            record = { url: legacy.url, name: legacy.name, loadedAt: Date.now(), data };
            await savePlaylist(record);
          } catch (err) {
            console.error("[vexia] falha ao migrar a lista antiga", err);
          }
          dropLegacyText();
        }
      }
      if (!alive) return;
      if (record) setStored(record);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (record: StoredPlaylist, retry: () => void) => {
    setStored(record);
    try {
      await savePlaylist(record);
      return true;
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        retryRef.current = retry;
        setQuotaOpen(true);
        return false;
      }
      console.error("[vexia] falha ao persistir a lista", err);
      return false;
    }
  }, []);

  const loadFromText = useCallback(
    async (text: string, name = "Lista local") => {
      const data = await parseInWorker(text);
      if (data.total === 0) {
        setError("Nenhum canal ou título encontrado nessa lista.");
        return false;
      }
      setError(null);
      await persist({ url: "", name, loadedAt: Date.now(), data }, () => void loadFromText(text, name));
      return true;
    },
    [persist],
  );

  const loadFromUrl = useCallback(
    async (url: string, name?: string, onEvent?: (event: PlaylistLoadEvent) => void) => {
      setLoading(true);
      setError(null);
      try {
        onEvent?.({ stage: 0 });
        const { text } = await fetchPlaylist({ data: { url } });
        const data = await parseInWorker(text, onEvent);
        if (data.total === 0) {
          setError("Nenhum canal ou título encontrado nessa lista.");
          return false;
        }
        onEvent?.({ stage: 7 });
        const record: StoredPlaylist = {
          url,
          name: name || new URL(url).hostname,
          loadedAt: Date.now(),
          data,
        };
        await persist(record, () => void loadFromUrl(url, name));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao carregar a lista.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const reload = useCallback(async () => {
    if (!stored?.url) return false;
    return loadFromUrl(stored.url, stored.name);
  }, [stored, loadFromUrl]);

  const clear = useCallback(() => {
    setError(null);
    setStored(null);
    void clearPlaylist();
  }, []);

  const data = stored?.data ?? null;

  const value: PlaylistContextValue = {
    ready,
    loading,
    error,
    source: stored ? { url: stored.url, name: stored.name, loadedAt: stored.loadedAt } : null,
    data,
    hasContent: !!data && data.total > 0,
    movies: data?.movies ?? [],
    series: data?.series ?? [],
    channels: data?.channels ?? [],
    loadFromUrl,
    loadFromText,
    reload,
    clear,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
      <StorageErrorDialog
        open={quotaOpen}
        onClose={() => setQuotaOpen(false)}
        onRetry={() => {
          setQuotaOpen(false);
          retryRef.current?.();
        }}
        onClear={() => {
          setQuotaOpen(false);
          clear();
        }}
      />
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist precisa estar dentro de PlaylistProvider");
  return ctx;
}

export function findPlaylistMedia(data: ParsedPlaylist | null, id: string) {
  if (!data) return undefined;
  return (
    data.movies.find((m) => m.id === id) ??
    data.series.find((s) => s.id === id) ??
    // IDs antigos (slug + índice) continuam válidos para favoritos/histórico.
    data.movies.find((m) => matchesLegacyId(id, m.title)) ??
    data.series.find((s) => matchesLegacyId(id, s.title))
  );
}
