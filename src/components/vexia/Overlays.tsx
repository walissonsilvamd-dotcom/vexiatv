import { Loader2, CheckCircle2, LogOut } from "lucide-react";

export function ReloadOverlay({ done }: { done: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-vexia-surface px-12 py-10">
        {done ? (
          <CheckCircle2 className="h-10 w-10 text-vexia-cyan" aria-hidden />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-vexia-purple-soft" aria-hidden />
        )}
        <p className="text-sm font-semibold tracking-wide text-vexia-text">
          {done ? "Conteúdo atualizado" : "Atualizando conteúdo..."}
        </p>
      </div>
    </div>
  );
}

export function ExitDialog({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm">
      <div className="w-[min(90vw,420px)] rounded-2xl border border-white/10 bg-vexia-surface p-8 text-center">
        <LogOut className="mx-auto h-8 w-8 text-vexia-purple-soft" aria-hidden />
        <h2 className="mt-4 text-xl font-bold text-vexia-text">Você deseja sair?</h2>
        <p className="mt-2 text-sm text-vexia-muted">O VÉXIA TV será encerrado.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="vexia-focus rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan px-8 py-2.5 text-sm font-bold text-vexia-text"
          >
            SIM
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="vexia-focus rounded-full border border-white/20 bg-white/10 px-8 py-2.5 text-sm font-semibold text-vexia-text"
          >
            NÃO
          </button>
        </div>
      </div>
    </div>
  );
}
