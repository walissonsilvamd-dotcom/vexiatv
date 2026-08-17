import { useCallback, useEffect, useMemo, useState } from "react";
import { isAdultText } from "./parental";

/**
 * Progresso de reprodução (Continuar Assistindo) e episódios assistidos.
 * Guardado localmente no aparelho — no APK real vem do player.
 */
export type ProgressEntry = {
  percent: number;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
  label?: string;
  title?: string;
  category?: string;
};

const KEY = "vexia:progress";

function readAll(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, ProgressEntry>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ProgressEntry>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("vexia:progress-change"));
}

export function saveProgress(id: string, entry: Omit<ProgressEntry, "updatedAt">) {
  const all = readAll();
  all[id] = { ...entry, updatedAt: Date.now() };
  writeAll(all);
}

export function clearProgress(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

/** Progresso de um título e dos seus episódios (prefixo do id). */
export function useProgress(id: string | undefined) {
  const [all, setAll] = useState<Record<string, ProgressEntry>>({});

  useEffect(() => {
    const sync = () => setAll(readAll());
    sync();
    window.addEventListener("vexia:progress-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vexia:progress-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const entryFor = useCallback((key: string) => all[key], [all]);

  const resume = (() => {
    if (!id) return undefined;
    const own = all[id];
    if (own && own.percent > 2 && own.percent < 95) return { key: id, ...own };
    const eps = Object.entries(all)
      .filter(([key, v]) => key.startsWith(`${id}::`) && v.percent > 2 && v.percent < 95)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
    return eps ? { key: eps[0], ...eps[1] } : undefined;
  })();

  return { entryFor, resume, all };
}

export function useProgressList() {
  const [all, setAll] = useState<Record<string, ProgressEntry>>({});

  useEffect(() => {
    const sync = () => setAll(readAll());
    sync();
    window.addEventListener("vexia:progress-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("vexia:progress-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return useMemo(() => {
    return Object.values(all)
      .filter(entry => {
        // Filtra conteúdo adulto da lista "Continuar Assistindo"
        const isAdult = isAdultText(entry.title || entry.label || "", entry.category || "");
        return !isAdult;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [all]);
}

export function isWatched(entry: ProgressEntry | undefined) {
  return !!entry && entry.percent >= 95;
}
