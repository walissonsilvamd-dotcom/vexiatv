import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "pt-BR" | "en-US" | "es-ES";
export type DisplayMode = "horizontal" | "vertical";
export type SortMode = "az" | "za" | "recent" | "popular";
export type Quality = "auto" | "low" | "medium" | "high" | "original";
export type PlayerMode = "internal" | "external";
export type TimeFormat = "24h" | "12h";
export type SubtitleSize = "small" | "medium" | "large";
export type SubtitleColor = "white" | "yellow";
/** Passo de avanço/retrocesso do player, em segundos. */
export type SeekStep = 5 | 10 | 15 | 30;
/**
 * Perfil de desempenho do player:
 * - "eco": buffers curtos e qualidade contida — TVs e boxes fracos.
 * - "balanced": padrão.
 * - "smooth": buffer grande e qualidade agressiva — internet boa.
 */
export type PerfProfile = "eco" | "balanced" | "smooth";

export type VexiaSettings = {
  // Controle dos pais
  parentalEnabled: boolean;
  parentalPin: string;
  // Visibilidade
  hideCategories: boolean;
  hideVod: boolean;
  hideSeries: boolean;
  // Preferências
  language: Language;
  displayMode: DisplayMode;
  sortMode: SortMode;
  quality: Quality;
  player: PlayerMode;
  autoPlay: boolean;
  /** Troca de episódio sem pedir confirmação. */
  episodeQuickSwitch: boolean;
  autoUpdate: boolean;
  timeFormat: TimeFormat;
  // Legendas
  subtitlesEnabled: boolean;
  subtitleSize: SubtitleSize;
  subtitleColor: SubtitleColor;
  /** Caixa escura atrás da legenda: ajuda em cenas claras. */
  subtitleBackdrop: boolean;
  /** Segundos que os botões de avanço/retrocesso pulam no player. */
  seekStep: SeekStep;
  /** Picture-in-Picture: janela flutuante ao sair do player. */
  pipEnabled: boolean;
  /** Pergunta antes de sair do aplicativo. */
  confirmExit: boolean;
  /** Perfil de desempenho do player (buffer e agressividade da qualidade). */
  perfProfile: PerfProfile;
};

export const DEFAULT_SETTINGS: VexiaSettings = {
  parentalEnabled: false,
  parentalPin: "",
  hideCategories: false,
  hideVod: false,
  hideSeries: false,
  language: "pt-BR",
  displayMode: "horizontal",
  sortMode: "az",
  quality: "auto",
  player: "internal",
  autoPlay: true,
  episodeQuickSwitch: false,
  autoUpdate: true,
  timeFormat: "24h",
  subtitlesEnabled: false,
  subtitleSize: "medium",
  subtitleColor: "white",
  subtitleBackdrop: true,
  seekStep: 10,
  pipEnabled: false,
  confirmExit: true,
  perfProfile: "balanced",
};

export type HistoryKind = "movie" | "series";
export type HistoryEntry = { id: string; title: string; kind: HistoryKind; at: number };

const SETTINGS_KEY = "vexia:settings";
const HISTORY_KEY = "vexia:history";
/** Aviso interno de mudança de preferências (mesma aba). */
const SETTINGS_EVENT = "vexia:settings-changed";


type Ctx = {
  settings: VexiaSettings;
  set: <K extends keyof VexiaSettings>(key: K, value: VexiaSettings[K]) => void;
  toggle: (key: keyof VexiaSettings) => void;
  reset: () => void;
  history: HistoryEntry[];
  addHistory: (entry: Omit<HistoryEntry, "at">) => void;
  clearHistory: (kind?: HistoryKind) => void;
  formatTime: (date: Date) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Leitura fora do React (motores de vídeo, TMDB). */
export function readSettings(): VexiaSettings {
  return readJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VexiaSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Carrega as preferências salvas no aparelho após a hidratação.
  useEffect(() => {
    setSettings(readJSON(SETTINGS_KEY, DEFAULT_SETTINGS));
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
    } catch {
      /* ignora histórico corrompido */
    }
  }, []);

  // Mantém qualquer tela aberta (inclusive o player em reprodução) em sincronia
  // com mudanças feitas em Ajustes, sem precisar recarregar.
  useEffect(() => {
    const sync = () => setSettings(readJSON(SETTINGS_KEY, DEFAULT_SETTINGS));
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === SETTINGS_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SETTINGS_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SETTINGS_EVENT, sync);
    };
  }, []);

  // Estilo de Interface: aplica o modo de exibição no documento inteiro.
  useEffect(() => {
    document.documentElement.dataset.vexiaLayout = settings.displayMode;
  }, [settings.displayMode]);

  // Idioma e Região: idioma do documento (leitores de tela, datas, TMDB).
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const persist = useCallback((next: VexiaSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SETTINGS_EVENT));
    } catch {
      /* armazenamento indisponível */
    }
  }, []);


  const persistHistory = useCallback((next: HistoryEntry[]) => {
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      settings,
      set: (key, val) => persist({ ...settings, [key]: val }),
      toggle: (key) => {
        const current = settings[key];
        if (typeof current === "boolean") {
          persist({ ...settings, [key]: !current } as VexiaSettings);
        }
      },
      reset: () => persist(DEFAULT_SETTINGS),
      history,
      addHistory: (entry) =>
        persistHistory([
          { ...entry, at: Date.now() },
          ...history.filter((h) => h.id !== entry.id),
        ].slice(0, 100)),
      clearHistory: (kind) =>
        persistHistory(kind ? history.filter((h) => h.kind !== kind) : []),
      formatTime: (date) =>
        date.toLocaleTimeString(settings.language, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: settings.timeFormat === "12h",
        }),
    }),
    [settings, history, persist, persistHistory],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings precisa estar dentro de SettingsProvider");
  return ctx;
}
