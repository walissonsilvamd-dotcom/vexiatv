import { useEpg, useMinuteTick, nowAndNext } from "../../hooks/use-epg";

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Guia rápido no player ao vivo: programa no ar com barra de progresso e o
 * próximo da grade. Aparece só quando a lista traz EPG.
 */
export function PlayerEpgBar({ tvgId }: { tvgId?: string }) {
  const { guide } = useEpg();
  const now = useMinuteTick();
  const { now: current, next } = nowAndNext(guide, tvgId, now);
  if (!current) return null;

  const pct = Math.min(
    100,
    Math.max(0, ((now - current.start) / Math.max(1, current.stop - current.start)) * 100),
  );

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/55 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-white">{current.title}</span>
        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/15">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan"
            style={{ width: `${Math.round(pct)}%` }}
          />
        </span>
        {next ? (
          <span className="mt-1 block truncate text-[10px] text-white/55">
            A seguir: {next.title} · {clock(next.start)}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-vexia-cyan">
        {clock(current.start)} – {clock(current.stop)}
      </span>
    </div>
  );
}
