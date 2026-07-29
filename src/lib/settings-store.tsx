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
  autoUpdate: boolean;
  timeFormat: TimeFormat;
  // Legendas
  subtitlesEnabled: boolean;
  subtitleSize: SubtitleSize;
  subtitleColor: SubtitleColor;
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
  autoUpdate: true,
  timeFormat: "24h",
  subtitlesEnabled: false,
  subtitleSize: "medium",
  subtitleColor: "white",
};

export type HistoryKind = "movie" | "series";
export type HistoryEntry = { id: string; title: string; kind: HistoryKind; at: number };

const SETTINGS_KEY = "vexia:settings";
const HISTORY_KEY = "vexia:history";

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

  const persist = useCallback((next: VexiaSettings) => {
    setSettings(next);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
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
