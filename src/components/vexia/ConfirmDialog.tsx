import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

/** Diálogo de confirmação premium (D-pad / teclado: Esc cancela). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "REMOVER",
  cancelLabel = "CANCELAR",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/80 px-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f] p-6 text-center shadow-[0_0_40px_rgba(123,47,190,0.35)]"
      >
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-vexia-purple/40 bg-vexia-purple/15">
          <AlertTriangle className="h-5 w-5 text-vexia-purple-soft" aria-hidden />
        </span>
        <p className="text-base font-black text-vexia-text">{title}</p>
        {message ? <p className="mt-2 text-sm text-vexia-text/70">{message}</p> : null}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            tabIndex={0}
            onClick={onCancel}
            className="vexia-focus rounded-full border border-white/20 px-5 py-2 text-xs font-bold text-vexia-text"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            tabIndex={0}
            onClick={onConfirm}
            className="vexia-focus rounded-full bg-vexia-purple px-6 py-2 text-xs font-black text-white shadow-[0_0_20px_rgba(123,47,190,0.55)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
