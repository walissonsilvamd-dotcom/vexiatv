import { useCallback, useEffect, useState } from "react";

import type { HlsLike } from "./useMediaTracks";

/**
 * Qualidade REAL do stream.
 *
 * Antes o menu mostrava uma lista fixa ("4K / FHD / HD / SD") que não trocava
 * nada. Aqui lemos as faixas que o manifesto realmente entrega (hls.levels) e
 * trocamos de verdade via currentLevel, mantendo "Auto" (ABR) como padrão.
 * Em stream sem manifesto (MPEG-TS puro/nativo) a lista fica vazia e o player
 * exibe apenas a resolução medida no elemento <video>.
 */

export const QUALITY_AUTO = -1;

export type QualityLevel = {
  /** Índice real dentro de hls.levels (ou -1 para automático). */
  id: number;
  label: string;
  height: number;
  bitrate: number;
};

type HlsQuality = HlsLike & {
  levels?: { height?: number; width?: number; bitrate?: number; name?: string }[];
  currentLevel?: number;
  nextLevel?: number;
  loadLevel?: number;
  autoLevelEnabled?: boolean;
  bandwidthEstimate?: number;
};

function levelLabel(height: number, bitrate: number, fallback: string) {
  if (height >= 2160) return "4K";
  if (height >= 1440) return "2K";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  if (height > 0) return `${height}p`;
  if (bitrate > 0) return `${Math.round(bitrate / 1000)} kbps`;
  return fallback;
}

export function useQualityLevels(hls: HlsLike | null, ready: boolean) {
  const api = hls as HlsQuality | null;
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selected, setSelected] = useState<number>(QUALITY_AUTO);
  const [activeId, setActiveId] = useState<number>(QUALITY_AUTO);

  /* Lista de faixas + faixa que está no ar agora (a ABR troca sozinha). */
  useEffect(() => {
    if (!api) {
      setLevels([]);
      setSelected(QUALITY_AUTO);
      setActiveId(QUALITY_AUTO);
      return;
    }
    let cancelled = false;

    const collect = () => {
      if (cancelled) return;
      const list = api.levels ?? [];
      setLevels(
        list.map((level, i) => ({
          id: i,
          height: level.height ?? 0,
          bitrate: level.bitrate ?? 0,
          label: levelLabel(level.height ?? 0, level.bitrate ?? 0, level.name || `Faixa ${i + 1}`),
        })),
      );
      const auto = api.autoLevelEnabled !== false && (api.currentLevel ?? -1) === -1;
      const running = api.currentLevel ?? -1;
      setActiveId(running);
      setSelected(auto ? QUALITY_AUTO : running);
    };

    collect();
    const timer = window.setInterval(collect, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api, ready]);

  const select = useCallback(
    (id: number) => {
      setSelected(id);
      if (!api) return;
      // -1 devolve o controle para a ABR; qualquer outro trava naquela faixa.
      api.currentLevel = id;
      if (id !== QUALITY_AUTO) api.nextLevel = id;
    },
    [api],
  );

  const currentLabel = (() => {
    const running = levels.find((l) => l.id === activeId);
    if (selected === QUALITY_AUTO) return running ? `Auto · ${running.label}` : "Auto";
    return levels.find((l) => l.id === selected)?.label ?? "Auto";
  })();

  /** Rótulo curto para o cabeçalho (sem o prefixo "Auto"). */
  const activeLabel = levels.find((l) => l.id === activeId)?.label ?? null;

  return { levels, selected, select, currentLabel, activeLabel, activeId };
}
