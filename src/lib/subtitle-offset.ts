/**
 * Ajuste de sincronia (offset) das legendas.
 *
 * Desloca no tempo as falas exibidas: valor positivo mostra a legenda mais
 * tarde, negativo mostra antes. Guardamos os tempos originais de cada fala
 * para que o ajuste seja sempre calculado a partir deles (e não acumulado).
 */

type OriginalTimes = { start: number; end: number };

export type SubtitleOffsetController = {
  setOffset: (seconds: number) => void;
  refresh: () => void;
  destroy: () => void;
};

export function createSubtitleOffsetController(
  video: HTMLVideoElement,
): SubtitleOffsetController {
  const originals = new WeakMap<TextTrackCue, OriginalTimes>();
  let offset = 0;
  let disposed = false;

  const apply = () => {
    if (disposed) return;
    const tracks = video.textTracks;
    if (!tracks) return;
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (track.kind !== "subtitles" && track.kind !== "captions") continue;
      const cues = track.cues;
      if (!cues) continue;
      for (let c = 0; c < cues.length; c++) {
        const cue = cues[c];
        let base = originals.get(cue);
        if (!base) {
          base = { start: cue.startTime, end: cue.endTime };
          originals.set(cue, base);
        }
        const nextStart = Math.max(0, base.start + offset);
        const nextEnd = Math.max(nextStart + 0.05, base.end + offset);
        if (cue.startTime !== nextStart) cue.startTime = nextStart;
        if (cue.endTime !== nextEnd) cue.endTime = nextEnd;
      }
    }
  };

  // Faixas e falas chegam aos poucos (HLS), então reaplicamos periodicamente.
  const timer = setInterval(apply, 700);
  const onChange = () => apply();
  video.textTracks?.addEventListener?.("addtrack", onChange);
  video.textTracks?.addEventListener?.("change", onChange);

  return {
    setOffset(seconds: number) {
      offset = Number.isFinite(seconds) ? seconds : 0;
      apply();
    },
    refresh: apply,
    destroy() {
      disposed = true;
      clearInterval(timer);
      video.textTracks?.removeEventListener?.("addtrack", onChange);
      video.textTracks?.removeEventListener?.("change", onChange);
    },
  };
}
