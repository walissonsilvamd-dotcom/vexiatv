import { useEffect, useRef } from "react";
import { Tv } from "lucide-react";
import type { PlaylistChannel } from "../../lib/m3u";
import { SmartImage } from "./SmartImage";

/**
 * Zapping ao vivo: lista de canais sobre o vídeo, para trocar de canal sem
 * sair do player (canal ↑/↓ do controle abre e navega direto).
 */
export function ChannelZapList({
  open,
  channels,
  currentId,
  onPick,
  onClose,
}: {
  open: boolean;
  channels: PlaylistChannel[];
  currentId: string;
  onPick: (ch: PlaylistChannel) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Ao abrir, foca o canal atual para o D-pad continuar de onde está.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const el =
        boxRef.current?.querySelector<HTMLButtonElement>('button[data-current="true"]') ??
        boxRef.current?.querySelector<HTMLButtonElement>("button");
      el?.focus();
      el?.scrollIntoView({ block: "center" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const move = (dir: 1 | -1) => {
    const items = Array.from(boxRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = items[Math.max(0, Math.min(items.length - 1, i + dir))];
    next?.focus();
    next?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div
      className="absolute inset-y-0 right-0 z-50 flex w-[320px] max-w-[80vw] flex-col border-l border-vexia-purple/40 bg-black/92 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          move(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          move(-1);
        } else if (e.key === "Escape" || e.key === "Backspace" || e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <p className="shrink-0 border-b border-white/10 px-4 py-3 text-[11px] font-black tracking-[0.2em] text-vexia-cyan">
        TROCAR DE CANAL
      </p>
      <div ref={boxRef} className="vexia-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {channels.map((ch) => {
          const current = ch.id === currentId;
          return (
            <button
              key={ch.id}
              type="button"
              data-current={current}
              onClick={() => onPick(ch)}
              className={`vexia-focus flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left ${
                current ? "bg-vexia-purple text-white" : "text-white/85 hover:bg-white/10"
              }`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/60">
                {ch.logo ? (
                  <SmartImage
                    src={ch.logo}
                    role="logo"
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                    fallback={<Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />}
                  />
                ) : (
                  <Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{ch.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
