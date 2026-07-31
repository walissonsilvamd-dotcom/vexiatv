import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createPairSession, getPairSession } from "./pair.functions";

export type PairResult = { name?: string; url: string };

/**
 * Pareamento TV ↔ celular: a TV cria um código, mostra no QR Code e fica
 * consultando até o celular enviar o link da lista.
 */
export function usePairing(enabled: boolean, onReceive: (r: PairResult) => void) {
  const create = useServerFn(createPairSession);
  const poll = useServerFn(getPairSession);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "waiting" | "expired" | "error">(
    "idle",
  );
  const onReceiveRef = useRef(onReceive);
  onReceiveRef.current = onReceive;
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setCode(null);
      setStatus("idle");
      return;
    }
    let alive = true;
    setStatus("creating");
    void create({ data: undefined })
      .then((r) => {
        if (!alive) return;
        setCode(r.code);
        setStatus("waiting");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [enabled, nonce, create]);

  useEffect(() => {
    if (!enabled || !code || status !== "waiting") return;
    let alive = true;
    const id = setInterval(() => {
      void poll({ data: { code } })
        .then((r) => {
          if (!alive) return;
          if (r.status === "claimed") {
            setStatus("idle");
            onReceiveRef.current({ name: r.name, url: r.url });
          } else if (r.status === "expired" || r.status === "missing") {
            setStatus("expired");
          }
        })
        .catch(() => {});
    }, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enabled, code, status, poll]);

  return { code, status, refresh };
}
