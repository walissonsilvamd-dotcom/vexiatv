import { HardDrive } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Aviso de cota de armazenamento estourada (IndexedDB/localStorage).
 * Segue o visual dos demais diálogos do VÉXIA TV.
 */
export function StorageErrorDialog({
  open,
  onRetry,
  onClear,
  onClose,
}: {
  open: boolean;
  onRetry: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    retryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Armazenamento insuficiente"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f] p-6 text-center shadow-[0_0_40px_rgb(var(--vexia-primary-rgb)/0.35)]"
      >
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-vexia-purple/40 bg-vexia-purple/15">
          <HardDrive className="h-5 w-5 text-vexia-purple-soft" aria-hidden />
        </span>
        <p className="text-base font-black text-vexia-text">Armazenamento insuficiente</p>
        <p className="mt-2 text-sm text-vexia-text/70">
          Espaço de armazenamento insuficiente. Tente liberar espaço ou reduzir o tamanho da lista.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            tabIndex={0}
            onClick={onClear}
            className="vexia-focus rounded-full border border-white/20 px-5 py-2 text-xs font-bold text-vexia-text"
          >
            LIMPAR DADOS
          </button>
          <button
            ref={retryRef}
            type="button"
            tabIndex={0}
            onClick={onRetry}
            className="vexia-focus rounded-full bg-vexia-purple px-6 py-2 text-xs font-black text-white shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.55)]"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    </div>
  );
}
