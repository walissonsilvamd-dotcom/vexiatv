import { useEffect, useState } from "react";

export const SLEEP_OPTIONS = [0, 15, 30, 60, 90] as const;
export type SleepMinutes = (typeof SLEEP_OPTIONS)[number];

/**
 * Sleep timer: pausa a reprodução quando o tempo escolhido acaba (padrão dos
 * apps de TV para quem dorme assistindo). 0 = desligado.
 */
export function useSleepTimer(onExpire: () => void) {
  const [minutes, setMinutes] = useState<SleepMinutes>(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setEndsAt(minutes > 0 ? Date.now() + minutes * 60_000 : null);
  }, [minutes]);

  useEffect(() => {
    if (endsAt == null) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(Math.ceil(left / 1000));
      if (left <= 0) {
        setMinutes(0);
        onExpire();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, onExpire]);

  const label =
    minutes === 0
      ? "Desligado"
      : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return { minutes, setMinutes, remaining, label };
}
