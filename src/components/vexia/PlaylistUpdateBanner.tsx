import { RefreshCw, X } from "lucide-react";
import { describeDiff } from "../../lib/playlist-diff";
import { usePlaylist } from "../../lib/playlist-store";

/**
 * Aviso do que mudou depois da revalidação automática da lista.
 * Não bloqueia a navegação: fica no rodapé e some quando o usuário fecha.
 */
export function PlaylistUpdateBanner() {
  const { update, updating, dismissUpdate } = usePlaylist();

  if (updating) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90]">
        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-vexia-text/80 backdrop-blur-xl">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-vexia-cyan" aria-hidden />
          Atualizando sua lista…
        </span>
      </div>
    );
  }

  if (!update) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[90] max-w-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-vexia-purple/50 bg-black/85 px-4 py-3 shadow-[0_0_28px_rgb(var(--vexia-primary-rgb)/0.5)] backdrop-blur-xl">
        <RefreshCw className="h-4 w-4 shrink-0 text-vexia-cyan" aria-hidden />
        <p className="min-w-0 text-xs text-vexia-text">
          <span className="block font-black uppercase tracking-widest text-white">
            Lista atualizada
          </span>
          <span className="block truncate text-vexia-text/75">{describeDiff(update)}</span>
        </p>
        <button
          type="button"
          onClick={dismissUpdate}
          aria-label="Fechar aviso"
          className="vexia-focus ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-vexia-text/70"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
