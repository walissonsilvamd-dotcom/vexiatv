import { ArrowLeft, RotateCcw, WifiOff } from "lucide-react";

/** Painel de erro de download da lista, com retry manual. */
export function PlaylistError({
  message,
  detail,
  onRetry,
  onBack,
}: {
  message?: string | null;
  detail?: string | null;
  onRetry: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-[#FF1744]/40 bg-vexia-popup/90 p-6 text-center">
      <WifiOff className="mx-auto h-8 w-8 text-[#FF1744]" aria-hidden />
      <p className="mt-3 text-lg font-black text-white">
        {message ?? "Não foi possível carregar a lista. Verifique sua conexão e tente novamente."}
      </p>
      {detail ? <p className="mt-2 text-xs text-vexia-muted">{detail}</p> : null}
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-vexia-muted">
        Verifique
      </p>
      <ul className="mt-2 space-y-1 text-sm text-vexia-muted">
        <li>• Link informado</li>
        <li>• Conexão com internet</li>
        <li>• Disponibilidade do servidor</li>
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          autoFocus
          onClick={onRetry}
          className="vexia-focus flex items-center gap-2 rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_0_30px_-8px_var(--vexia-purple)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
        </button>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="vexia-focus flex items-center gap-2 rounded-full border border-vexia-cyan/60 px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-vexia-cyan"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
          </button>
        ) : null}
      </div>
    </div>
  );
}
