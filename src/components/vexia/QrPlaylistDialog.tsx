import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { DEVICE_MAC } from "../../data/vexia-catalog";

export function QrPlaylistDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-[min(92vw,460px)] rounded-2xl border border-vexia-purple/40 bg-vexia-card p-6">
        <h2 className="text-center text-lg font-black tracking-wide text-vexia-purple-soft">
          ACESSE POR QR CODE
        </h2>
        <p className="mt-2 text-center text-xs text-vexia-muted">
          Cole o link da sua lista M3U ou HLS:
        </p>

        <div className="mt-5 flex justify-center">
          <div className="rounded-xl border-2 border-vexia-purple bg-white p-3">
            <QRCodeSVG value={url || "https://vexia.tv/playlist"} size={150} />
          </div>
        </div>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole aqui o link M3U ou HLS"
          className="mt-5 w-full rounded-lg border border-vexia-purple bg-black px-4 py-2.5 text-sm text-vexia-text placeholder:text-vexia-muted focus:outline-none"
        />

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="vexia-focus rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-text"
          >
            CARREGAR
          </button>
          <button
            type="button"
            onClick={onClose}
            className="vexia-focus rounded-full border border-vexia-cyan/50 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-cyan"
          >
            CANCELAR
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-vexia-cyan">MAC: {DEVICE_MAC}</p>
        <p className="mt-1 text-center text-[11px] text-vexia-muted">
          Seu Mundo Virtual Começa aqui!
        </p>
      </div>
    </div>
  );
}
