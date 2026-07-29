import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parsePlaylistText, type ParsedPlaylist, type PlaylistChannel, type PlaylistSeries } from "./m3u";
import { fetchPlaylist } from "./playlist.functions";
import type { MediaItem } from "../data/vexia";

const STORAGE_KEY = "vexia:playlist";

type StoredPlaylist = { url: string; name: string; text: string; loadedAt: number };

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
  loadFromText: (text: string, name?: string) => boolean;
  reload: () => Promise<boolean>;
  clear: () => void;
};

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredPlaylist | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStored(JSON.parse(raw) as StoredPlaylist);
    } catch {
      /* lista inválida no armazenamento local */
    }
    setReady(true);
  }, []);

  const persist = useCallback((value: StoredPlaylist | null) => {
    setStored(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* armazenamento cheio: mantém apenas em memória */
    }
  }, []);

  const data = useMemo(() => (stored ? parsePlaylistText(stored.text) : null), [stored]);

  const loadFromText = useCallback(
    (text: string, name = "Lista local") => {
      const parsed = parsePlaylistText(text);
      if (parsed.total === 0) {
        setError("Nenhum canal ou título encontrado nessa lista.");
        return false;
      }
      setError(null);
      persist({ url: "", name, text, loadedAt: Date.now() });
      return true;
    },
    [persist],
  );

  const loadFromUrl = useCallback(
    async (url: string, name?: string) => {
      setLoading(true);
      setError(null);
      try {
        const { text } = await fetchPlaylist({ data: { url } });
        const parsed = parsePlaylistText(text);
        if (parsed.total === 0) {
          setError("Nenhum canal ou título encontrado nessa lista.");
          return false;
        }
        persist({ url, name: name || new URL(url).hostname, text, loadedAt: Date.now() });
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
    clear: () => {
      setError(null);
      persist(null);
    },
  };

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist precisa estar dentro de PlaylistProvider");
  return ctx;
}

export function findPlaylistMedia(data: ParsedPlaylist | null, id: string) {
  if (!data) return undefined;
  return data.movies.find((m) => m.id === id) ?? data.series.find((s) => s.id === id);
}
