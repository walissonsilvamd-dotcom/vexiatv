import { Captions, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Escolha de legenda externa: arquivo .srt/.vtt do aparelho ou link direto.
 * O player converte para WebVTT e exibe na hora.
 */
export function ExternalSubsDialog({
  open,
  onClose,
  onPick,
  onClear,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (source: string | File) => Promise<string | null>;
  onClear: () => void;
  current?: string | null;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const apply = async (source: string | File) => {
    setBusy(true);
    setError("");
    const err = await onPick(source);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-black/85 px-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-vexia-purple/40 bg-[#0B0B0F]/95 p-6">
        <div className="flex items-center gap-3">
          <Captions className="h-5 w-5 text-vexia-cyan" aria-hidden />
          <h2 className="flex-1 text-lg font-black text-white">Legenda externa</h2>
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Fechar"
            className="vexia-focus grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs text-[#B6B6C2]">
          Aceita arquivos .srt e .vtt. O ajuste de sincronia (− / +) também funciona nela.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".srt,.vtt,text/vtt,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void apply(file);
          }}
        />
        <button
          type="button"
          tabIndex={0}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="vexia-focus mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-vexia-cyan/40 bg-black/50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-vexia-cyan"
        >
          <Upload className="h-4 w-4" aria-hidden /> Escolher arquivo
        </button>

        <div className="mt-3 flex gap-2">
          <input
            value={url}
            tabIndex={0}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && url.trim() && void apply(url.trim())}
            placeholder="https://.../legenda.srt"
            aria-label="Link da legenda"
            className="vexia-focus min-w-0 flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-white outline-none"
          />
          <button
            type="button"
            tabIndex={0}
            disabled={busy || !url.trim()}
            onClick={() => void apply(url.trim())}
            className="vexia-focus rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-40"
          >
            Usar
          </button>
        </div>

        {error ? <p className="mt-3 text-xs font-bold text-red-400">{error}</p> : null}
        {busy ? <p className="mt-3 text-xs text-vexia-cyan">Carregando legenda…</p> : null}

        {current ? (
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              onClear();
              onClose();
            }}
            className="vexia-focus mt-4 w-full rounded-xl border border-white/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#C9C9D6]"
          >
            Remover legenda externa
          </button>
        ) : null}
      </div>
    </div>
  );
}
