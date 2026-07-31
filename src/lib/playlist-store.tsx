import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { parsePlaylistText, type ParsedPlaylist, type PlaylistChannel, type PlaylistSeries } from "./m3u";
import { downloadPlaylist } from "../services/playlist.service";
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
import { fetchPlaylistAccount, isAccountExpired, type PlaylistAccount } from "./xtream";
import { fetchXtreamCatalog, xtreamCreds } from "./xtream-catalog";
import type { MediaItem } from "../data/vexia";
import { diffPlaylists, type PlaylistDiff } from "./playlist-diff";
import { useSettings } from "./settings-store";

/** Intervalo mínimo entre revalidações automáticas da lista (6 horas). */
const AUTO_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;


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
  /** Tentativa de download em andamento (1..3). */
  attempt?: number;
  attempts?: number;
  counts?: Partial<PlaylistCounts>;
};

type PlaylistContextValue = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  source: { url: string; name: string; loadedAt: number } | null;
  data: ParsedPlaylist | null;
  hasContent: boolean;
  /** Validade da assinatura (Xtream), quando disponível. */
  account: PlaylistAccount | null;
  /** true somente quando a data de expiração do plano já passou. */
  expired: boolean;
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
  /** Última mensagem de erro, disponível imediatamente após a falha. */
  getLastError: () => string | null;
  /** Reconsulta a validade no servidor do provedor. */
  refreshAccount: () => Promise<PlaylistAccount | null>;
  /** Resumo da última atualização automática (null quando não houve). */
  update: PlaylistDiff | null;
  /** true enquanto a lista é revalidada em segundo plano. */
  updating: boolean;
  /** Dispensa o aviso de atualização. */
  dismissUpdate: () => void;
  /** Revalida a lista sem travar a navegação. */
  refreshInBackground: () => Promise<void>;
  clear: () => void;
};


const PlaylistContext = createContext<PlaylistContextValue | null>(null);

/** Cria (quando possível) o worker de parse. */
function spawnParseWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("../workers/parse.worker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    console.error("[vexia] Web Worker indisponível, processando na thread principal", err);
    return null;
  }
}

type ParseSession = {
  /** Envia um pedaço da lista para o worker (streaming). */
  push: (text: string) => void;
  /** Finaliza e devolve a lista organizada. */
  end: () => Promise<ParsedPlaylist>;
};

/**
 * Sessão de processamento em streaming: os pedaços do download vão direto para
 * o worker, então a thread principal nunca guarda a lista inteira (listas de
 * 100 MB+ estouravam a memória de Smart TVs e o app parecia "não carregar").
 */
function createParseSession(onEvent?: (event: PlaylistLoadEvent) => void): ParseSession {
  const worker = spawnParseWorker();

  if (!worker) {
    const buffer: string[] = [];
    return {
      push: (text) => buffer.push(text),
      end: async () => parsePlaylistText(buffer.join("")),
    };
  }

  let settle: ((result: { data?: ParsedPlaylist; error?: string }) => void) | null = null;
  const finished = new Promise<{ data?: ParsedPlaylist; error?: string }>((resolve) => {
    settle = resolve;
  });

  worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === "stage") onEvent?.({ stage: msg.stage, counts: msg.counts });
    else if (msg.type === "progress") onEvent?.({ stage: msg.stage, ratio: msg.ratio });
    else if (msg.type === "done") settle?.({ data: msg.data });
    else settle?.({ error: msg.message });
  };
  worker.onerror = (err) => {
    console.error("[vexia] erro no worker de parse", err);
    settle?.({ error: "Falha ao processar a lista nesta TV. Tente uma lista menor." });
  };

  return {
    push: (text) => worker.postMessage({ type: "chunk", text }),
    end: async () => {
      worker.postMessage({ type: "end" });
      const result = await finished;
      worker.terminate();
      if (result.data) return result.data;
      throw new Error(result.error || "Falha ao processar a lista.");
    },
  };
}

/** Processa uma lista já em memória (arquivo local / link HLS único). */
function parseInWorker(
  text: string,
  onEvent?: (event: PlaylistLoadEvent) => void,
): Promise<ParsedPlaylist> {
  const session = createParseSession(onEvent);
  session.push(text);
  return session.end();
}

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredPlaylist | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  /* Guarda a última mensagem de forma síncrona: a tela de carregamento precisa
     dela imediatamente, antes do próximo render do React. */
  const lastErrorRef = useRef<string | null>(null);
  const setError = useCallback((message: string | null) => {
    lastErrorRef.current = message;
    setErrorState(message);
  }, []);
  const getLastError = useCallback(() => lastErrorRef.current, []);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [update, setUpdate] = useState<PlaylistDiff | null>(null);
  const [updating, setUpdating] = useState(false);
  const updatingRef = useRef(false);
  const storedRef = useRef<StoredPlaylist | null>(null);
  const { settings } = useSettings();
  const autoUpdate = settings.autoUpdate;
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

      // Revalida a assinatura em segundo plano: a lista continua salva e
      // utilizável; só é bloqueada se o provedor informar que expirou.
      if (record?.url) {
        const account = await fetchPlaylistAccount(record.url);
        if (!alive || !account) return;
        setStored((prev) => (prev ? { ...prev, account } : prev));
        void savePlaylist({ ...record, account }).catch(() => undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);


  /*
   * Relógio da assinatura. Listas podem valer 1 hora, 3 horas ou 30 dias — o
   * app precisa bloquear no instante exato da expiração, mesmo se estiver
   * aberto. Além do tique de 30s, agenda um disparo no momento do vencimento.
   */
  const [, tick] = useState(0);
  const expiresAt = stored?.account?.expiresAt ?? null;
  useEffect(() => {
    const bump = () => tick((n) => n + 1);
    const interval = window.setInterval(bump, 30_000);
    let exact: number | undefined;
    if (expiresAt) {
      const ms = expiresAt - Date.now();
      if (ms > 0 && ms < 2_000_000_000) exact = window.setTimeout(bump, ms + 1_000);
    }
    return () => {
      window.clearInterval(interval);
      if (exact !== undefined) window.clearTimeout(exact);
    };
  }, [expiresAt]);

  /*
   * Reconsulta o provedor de tempo em tempo (e ao voltar para o app): o plano
   * pode ser cortado antes da data prevista, e planos curtos exigem checagem
   * frequente.
   */
  const storedUrl = stored?.url;
  useEffect(() => {
    if (!storedUrl) return;
    let alive = true;
    const check = async () => {
      const account = await fetchPlaylistAccount(storedUrl);
      if (!alive || !account) return;
      setStored((prev) => (prev && prev.url === storedUrl ? { ...prev, account } : prev));
      void savePlaylist({ ...(stored as StoredPlaylist), account }).catch(() => undefined);
    };
    const interval = window.setInterval(() => void check(), 5 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedUrl]);

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
        onEvent?.({ stage: 0, ratio: 0 });
        let data: ParsedPlaylist | null = null;

        /*
         * Caminho rápido: painéis Xtream entregam o catálogo em JSON pela
         * player_api (canais/filmes/séries ~23MB) em vez do M3U completo
         * (134MB na lista do usuário). Cai para o M3U se a API não responder.
         */
        if (xtreamCreds(url)) {
          try {
            const fast = await fetchXtreamCatalog(url, (done: number, total: number) => {
              onEvent?.({ stage: done < 3 ? 0 : 3, ratio: done / total });
            });
            onEvent?.({ stage: 4, counts: { channels: fast.channels.length } });
            onEvent?.({ stage: 5, counts: { movies: fast.movies.length } });
            onEvent?.({ stage: 6, counts: { series: fast.series.length } });
            data = fast;
          } catch (err) {
            console.warn("[vexia] API do painel indisponível, usando o M3U completo", err);
            data = null;
          }
        }

        if (!data) {
          // Download em streaming direto para o worker (sem cópia gigante aqui).
          const session = createParseSession(onEvent);
          await downloadPlaylist(
            url,
            (ev) => {
              if (ev.type === "attempt")
                onEvent?.({ stage: 0, ratio: 0, attempt: ev.attempt, attempts: ev.total });
              else onEvent?.({ stage: 0, ratio: ev.ratio });
            },
            undefined,
            (chunk) => session.push(chunk),
          );
          data = await session.end();
        }

        if (data.total === 0) {
          setError(
            "A lista foi baixada, mas não trouxe nenhum canal ou título. Confira o link com o seu provedor.",
          );
          return false;
        }
        onEvent?.({ stage: 7 });
        const account = await fetchPlaylistAccount(url);
        const record: StoredPlaylist = {
          url,
          name: name || new URL(url).hostname,
          loadedAt: Date.now(),
          data,
          account,
        };
        await persist(record, () => void loadFromUrl(url, name));
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Erro ao carregar lista. Verifique a URL e tente novamente.",
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  /*
   * Revalidação silenciosa: baixa a lista de novo sem trocar a tela nem
   * limpar o conteúdo atual. Se algo mudou, guarda a nova versão e resume a
   * diferença para o aviso na tela.
   */
  const refreshInBackground = useCallback(async () => {
    const current = storedRef.current;
    if (!current?.url || updatingRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    updatingRef.current = true;
    setUpdating(true);
    try {
      let data: ParsedPlaylist | null = null;
      if (xtreamCreds(current.url)) {
        try {
          data = await fetchXtreamCatalog(current.url);
        } catch {
          data = null;
        }
      }
      if (!data) {
        const session = createParseSession();
        await downloadPlaylist(current.url, undefined, undefined, (chunk) => session.push(chunk));
        data = await session.end();
      }
      if (!data || data.total === 0) return;

      const diff = current.data ? diffPlaylists(current.data, data) : null;
      const record: StoredPlaylist = { ...current, data, loadedAt: Date.now() };
      setStored(record);
      void savePlaylist(record).catch(() => undefined);
      if (diff && !diff.unchanged) setUpdate(diff);
    } catch (err) {
      // Falha silenciosa: a lista salva continua valendo.
      console.warn("[vexia] atualização automática da lista falhou", err);
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  }, []);

  /* Dispara a revalidação ao abrir o app, respeitando o intervalo mínimo. */
  useEffect(() => {
    if (!ready || !autoUpdate || !stored?.url) return;
    if (Date.now() - (stored.loadedAt ?? 0) < AUTO_UPDATE_INTERVAL_MS) return;
    const timer = window.setTimeout(() => void refreshInBackground(), 4_000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoUpdate, stored?.url]);

  const reload = useCallback(async () => {
    if (!stored?.url) return false;
    return loadFromUrl(stored.url, stored.name);
  }, [stored, loadFromUrl]);


  const refreshAccount = useCallback(async () => {
    if (!stored?.url) return null;
    const account = await fetchPlaylistAccount(stored.url);
    if (!account) return stored.account ?? null;
    const next = { ...stored, account };
    setStored(next);
    void savePlaylist(next).catch(() => undefined);
    return account;
  }, [stored]);

  const clear = useCallback(() => {
    setError(null);
    setStored(null);
    void clearPlaylist();
  }, []);

  useEffect(() => {
    storedRef.current = stored;
  }, [stored]);

  const dismissUpdate = useCallback(() => setUpdate(null), []);

  const data = stored?.data ?? null;
  const account = stored?.account ?? null;

  const value: PlaylistContextValue = {
    ready,
    loading,
    error,
    source: stored ? { url: stored.url, name: stored.name, loadedAt: stored.loadedAt } : null,
    data,
    hasContent: !!data && data.total > 0,
    account,
    expired: isAccountExpired(account),
    movies: data?.movies ?? [],
    series: data?.series ?? [],
    channels: data?.channels ?? [],
    loadFromUrl,
    getLastError,
    loadFromText,
    reload,
    refreshAccount,
    update,
    updating,
    dismissUpdate,
    refreshInBackground,
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
