import { Lock } from "lucide-react";
import { useState } from "react";
import { unlockChannel } from "../../lib/channel-lock";
import { useSettings } from "../../lib/settings-store";

/** Pede o PIN para liberar um canal trancado individualmente. */
export function ChannelPinPrompt({
  open,
  channelId,
  channelName,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  channelId?: string;
  channelName?: string;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const { settings } = useSettings();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  if (!open || !channelId) return null;

  const submit = () => {
    if (!settings.parentalPin) {
      setError("Defina um PIN em Ajustes › Controle dos pais.");
      return;
    }
    if (unlockChannel(channelId, pin, settings.parentalPin)) {
      setPin("");
      setError("");
      onUnlocked?.();
      onClose();
    } else {
      setError("PIN incorreto.");
    }
  };

  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-black/85 px-6 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-vexia-purple/40 bg-[#0B0B0F]/95 p-6 shadow-[0_0_60px_rgb(var(--vexia-primary-rgb)/0.35)]">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-vexia-cyan" aria-hidden />
          <h2 className="text-lg font-black text-white">Canal bloqueado</h2>
        </div>
        <p className="mt-2 text-sm text-[#B6B6C2]">
          {channelName ? `"${channelName}" está trancado. ` : ""}Digite o PIN para liberar nesta
          sessão.
        </p>
        <input
          autoFocus
          tabIndex={0}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric"
          type="password"
          maxLength={4}
          placeholder="••••"
          aria-label="PIN do canal"
          className="vexia-focus mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg tracking-[0.6em] text-white outline-none"
        />
        {error ? <p className="mt-2 text-xs font-bold text-red-400">{error}</p> : null}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              setPin("");
              setError("");
              onClose();
            }}
            className="vexia-focus flex-1 rounded-2xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#C9C9D6]"
          >
            Cancelar
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={submit}
            className="vexia-focus flex-1 rounded-2xl bg-gradient-to-r from-vexia-purple to-vexia-purple-soft px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
          >
            Liberar
          </button>
        </div>
      </div>
    </div>
  );
}
