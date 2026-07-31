import { useEffect, useState } from "react";
import {
  fetchEpg,
  epgUrlFromPlaylist,
  nowAndNext,
  readEpgCache,
  writeEpgCache,
  type EpgGuide,
} from "../lib/epg";
import { usePlaylist } from "../lib/playlist-store";

/**
 * Carrega o guia de programação da lista atual (quando existir) e o mantém
 * atualizado. Nunca bloqueia a tela: enquanto não chega, os canais aparecem
 * normalmente sem o "no ar agora".
 */
export function useEpg() {
  const { source } = usePlaylist();
  const [guide, setGuide] = useState<EpgGuide | null>(() => readEpgCache());
  const [loading, setLoading] = useState(false);
  const url = source?.url ?? "";

  useEffect(() => {
    if (!url || guide) return;
    const epgUrl = epgUrlFromPlaylist(url);
    if (!epgUrl) return;
    const controller = new AbortController();
    setLoading(true);
    void fetchEpg(epgUrl, controller.signal)
      .then((next) => {
        if (controller.signal.aborted || !next) return;
        setGuide(next);
        writeEpgCache(next);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, guide]);

  return { guide, loading, hasEpg: !!guide };
}

/** Relógio compartilhado que avança de minuto em minuto. */
export function useMinuteTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export { nowAndNext };
