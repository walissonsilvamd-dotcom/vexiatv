import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DEVICE_MAC } from "../../data/vexia-catalog";
import { usePlaylist } from "../../lib/playlist-store";

export function QrPlaylistDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { loadFromUrl, loading, error, source, data, clear } = usePlaylist();
  const [url, setUrl] = useState("");
  if (!open) return null;

  const submit = async () => {
    if (!url.trim()) return;
    const ok = await loadFromUrl(url.trim());
    if (ok) {
      setUrl("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-[min(92vw,460px)] rounded-2xl border border-vexia-purple/40 bg-vexia-card p-6">
        <h2 className="text-center text-lg font-black tracking-wide text-vexia-purple-soft">
          MINHAS LISTAS
        </h2>
        <p className="mt-2 text-center text-xs text-vexia-muted">
          Cole o link da sua lista M3U — canais, filmes e séries do app vêm dela.
        </p>

        <div className="mt-5 flex justify-center">
          <div className="rounded-xl border-2 border-vexia-purple bg-white p-3">
            <QRCodeSVG value={url || source?.url || "https://vexia.tv/playlist"} size={150} />
          </div>
        </div>

        {source ? (
          <div className="mt-5 rounded-lg border border-vexia-cyan/30 bg-black/40 p-3 text-center text-[11px]">
            <p className="font-bold text-vexia-cyan">LISTA ATIVA: {source.name}</p>
            <p className="mt-1 text-vexia-muted">
              {data?.channels.length ?? 0} canais · {data?.movies.length ?? 0} filmes ·{" "}
              {data?.series.length ?? 0} séries
            </p>
          </div>
        ) : null}

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="http://servidor/get.php?...&type=m3u_plus"
          className="mt-4 w-full rounded-lg border border-vexia-purple bg-black px-4 py-2.5 text-sm text-vexia-text placeholder:text-vexia-muted focus:outline-none"
        />

        {error ? <p className="mt-2 text-center text-[11px] text-vexia-gold">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="vexia-focus flex items-center justify-center gap-2 rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-text disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {loading ? "CARREGANDO LISTA..." : "CARREGAR"}
          </button>
          {source ? (
            <button
              type="button"
              onClick={clear}
              className="vexia-focus rounded-full border border-vexia-gold/50 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-gold"
            >
              REMOVER LISTA
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="vexia-focus rounded-full border border-vexia-cyan/50 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-cyan"
          >
            FECHAR
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
