import { Link } from "@tanstack/react-router";
import { RefreshCw, WifiOff } from "lucide-react";
import { useState } from "react";
import { useOnline } from "../../hooks/use-online";
import { usePlaylist } from "../../lib/playlist-store";

/**
 * Tela clara de falha ao carregar a lista: mostra o motivo, permite tentar de
 * novo e — quando existe uma lista já salva — seguir usando o conteúdo em cache.
 */
export function PlaylistErrorState({ onDismiss }: { onDismiss?: () => void }) {
  const { error, reload, source, hasContent, loading } = usePlaylist();
  const online = useOnline();
  const [retrying, setRetrying] = useState(false);

  if (!error) return null;

  const reason = !online
    ? "Sem conexão com a internet. Verifique o Wi-Fi ou o cabo de rede da TV."
    : error;

  return (
    <div className="grid place-items-center rounded-2xl border border-vexia-purple/40 bg-vexia-card/70 px-6 py-12 text-center">
      <WifiOff className="h-8 w-8 text-vexia-purple-soft" aria-hidden />
      <p className="mt-3 text-sm font-black uppercase tracking-wide text-vexia-text">
        Não deu para atualizar a lista
      </p>
      <p className="mt-2 max-w-md text-xs text-vexia-muted">{reason}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={retrying || loading || !source?.url}
          onClick={async () => {
            setRetrying(true);
            await reload();
            setRetrying(false);
          }}
          className="vexia-focus flex items-center gap-2 rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-text disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${retrying || loading ? "animate-spin" : ""}`} aria-hidden />
          {retrying || loading ? "TENTANDO…" : "TENTAR NOVAMENTE"}
        </button>

        {hasContent ? (
          <button
            type="button"
            onClick={onDismiss}
            className="vexia-focus rounded-full border border-white/15 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-text/85"
          >
            USAR A LISTA SALVA
          </button>
        ) : (
          <Link
            to="/listas"
            className="vexia-focus rounded-full border border-white/15 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-text/85"
          >
            IR PARA LISTAS
          </Link>
        )}
      </div>
    </div>
  );
}
