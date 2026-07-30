import { useEffect, useState } from "react";

/**
 * Última sessão de reprodução (último episódio/filme/canal selecionado).
 * Serve para restaurar automaticamente o ponto de retomada ao reabrir o app.
 */
export type LastSession = {
  type: "live" | "movie" | "series";
  id: string;
  /** Id do episódio, quando série. */
  ep?: string;
  title: string;
  /** Ex.: "T1E4 • Piloto" */
  episodeLabel?: string;
  poster?: string;
  positionSec: number;
  durationSec: number;
  percent: number;
  updatedAt: number;
};

const KEY = "vexia:last-session";
const EVENT = "vexia:last-session-change";

export function readLastSession(): LastSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSession;
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLastSession(session: Omit<LastSession, "updatedAt">) {
  if (typeof window === "undefined" || !session.id) return;
  const previous = readLastSession();
  const next: LastSession = { ...session, updatedAt: Date.now() };
  // Evita gravações desnecessárias (mesmo item, avanço menor que 5s).
  if (
    previous &&
    previous.id === next.id &&
    previous.ep === next.ep &&
    Math.abs(previous.positionSec - next.positionSec) < 5
  ) {
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function clearLastSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Última sessão reativa (atualiza entre abas e após o player salvar). */
export function useLastSession() {
  const [session, setSession] = useState<LastSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(readLastSession());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return session;
}
