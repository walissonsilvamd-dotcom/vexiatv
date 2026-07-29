import { X } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-vexia-purple/40 bg-gradient-to-br from-[#1E1E1E] to-[#101010] p-6 shadow-[0_30px_70px_-20px_rgba(123,47,190,0.6)]"
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vexia-cyan/50 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/50 text-vexia-cyan transition-colors hover:border-vexia-cyan/60"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <h2 className="pr-10 text-lg font-black uppercase tracking-[0.12em] text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-[#9CA3AF]">{subtitle}</p> : null}

        <div className="mt-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function OptionRow({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-vexia-purple/60 bg-gradient-to-r from-vexia-purple/30 to-transparent shadow-[0_0_18px_-6px_rgba(123,47,190,0.9)]"
          : "border-white/10 bg-black/30 hover:border-vexia-purple/40"
      }`}
    >
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        {hint ? <span className="block text-[11px] text-[#9CA3AF]">{hint}</span> : null}
      </span>
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
          selected ? "border-vexia-cyan" : "border-white/25"
        }`}
      >
        {selected ? <span className="h-2.5 w-2.5 rounded-full bg-vexia-cyan" /> : null}
      </span>
    </button>
  );
}

export function SwitchRow({
  label,
  hint,
  active,
  onToggle,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left transition-colors hover:border-vexia-purple/40"
    >
      <span>
        <span className="block text-sm font-bold text-white">{label}</span>
        {hint ? <span className="block text-[11px] text-[#9CA3AF]">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-all ${
          active
            ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/70 shadow-[0_0_12px_rgba(123,47,190,0.55)]"
            : "bg-white/10"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${active ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}

export function ModalButton({
  children,
  variant = "primary",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles = {
    primary:
      "border-white/10 bg-gradient-to-b from-vexia-purple to-vexia-purple/70 text-white shadow-[0_10px_26px_-10px_rgba(123,47,190,0.9),inset_0_1px_0_rgba(255,255,255,0.25)]",
    danger:
      "border-red-500/30 bg-gradient-to-b from-red-600 to-red-700 text-white shadow-[0_10px_26px_-10px_rgba(220,38,38,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]",
    ghost: "border-white/15 bg-black/40 text-vexia-cyan hover:border-vexia-cyan/50",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-[0.14em] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}
