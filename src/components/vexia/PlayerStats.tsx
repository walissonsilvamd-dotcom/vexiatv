import { useEffect, useState } from "react";

/**
 * Info técnica do stream (diagnóstico de travamento, como o painel do APK
 * base): resolução, buffer à frente, motor ativo e tentativas de recuperação.
 */
export function PlayerStats({
  open,
  video,
  engine,
  standbyEngine,
  attempt,
}: {
  open: boolean;
  video: HTMLVideoElement | null;
  engine?: string | null;
  standbyEngine?: string | null;
  attempt: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const buffered = (() => {
    if (!video || !video.buffered.length) return 0;
    for (let i = 0; i < video.buffered.length; i += 1) {
      if (video.currentTime <= video.buffered.end(i)) {
        return Math.max(0, video.buffered.end(i) - video.currentTime);
      }
    }
    return 0;
  })();

  const rows: [string, string][] = [
    ["Resolução", video?.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—"],
    ["Buffer à frente", `${buffered.toFixed(1)}s`],
    ["Estado", video ? (video.paused ? "pausado" : "tocando") : "—"],
    ["Motor ativo", engine ?? "—"],
    ["Motor reserva", standbyEngine ?? "—"],
    ["Recuperações", String(attempt)],
  ];

  return (
    <div
      data-tick={tick}
      className="absolute left-5 top-20 z-50 w-[230px] rounded-xl border border-vexia-cyan/40 bg-black/85 p-3 font-mono text-[10px] text-white/85 backdrop-blur-sm"
    >
      <p className="mb-1.5 text-[10px] font-bold tracking-[0.16em] text-vexia-cyan">INFO TÉCNICA</p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-2">
          <span className="text-white/50">{k}</span>
          <span className="tabular-nums">{v}</span>
        </p>
      ))}
    </div>
  );
}
