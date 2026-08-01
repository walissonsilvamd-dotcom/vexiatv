import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

/**
 * Autoplay do próximo episódio: aparece nos últimos segundos com contagem,
 * como nos apps de TV. Confirmar toca na hora, cancelar mantém os créditos.
 */
export function NextEpisodePrompt({
  open,
  label,
  seconds = 10,
  onPlay,
  onCancel,
}: {
  open: boolean;
  label: string;
  seconds?: number;
  onPlay: () => void;
  onCancel: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (!open) {
      setLeft(seconds);
      return;
    }
    setLeft(seconds);
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          window.clearInterval(id);
          onPlay();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, seconds, onPlay]);

  if (!open) return null;

  return (
    <div className="absolute bottom-24 right-6 z-50 w-[300px] rounded-2xl border border-vexia-purple/50 bg-[#0b0b0f]/95 p-4 shadow-[0_0_30px_-8px_rgb(var(--vexia-primary-rgb)/0.9)]">
      <p className="text-[10px] font-bold tracking-[0.18em] text-vexia-cyan">
        PRÓXIMO EPISÓDIO EM {left}s
      </p>
      <p className="mt-1 truncate text-sm font-bold text-white">{label}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={onPlay}
          className="vexia-focus flex flex-1 items-center justify-center gap-1.5 rounded-full bg-vexia-purple px-3 py-2 text-[11px] font-bold text-white"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden /> ASSISTIR
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="vexia-focus flex items-center justify-center gap-1.5 rounded-full border border-white/25 px-3 py-2 text-[11px] font-bold text-white/80"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> CANCELAR
        </button>
      </div>
    </div>
  );
}
