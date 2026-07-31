import { ExternalLink, MonitorPlay } from "lucide-react";
import { useEffect, useState } from "react";
import { EXTERNAL_APPS, openInExternalPlayer, type ExternalApp } from "../../lib/external-player";

/**
 * Overlay exibido quando o usuário escolheu "Player externo" em Ajustes.
 * Enquanto estiver aberto, pausa qualquer vídeo interno para não tocar duas vezes.
 */
export function ExternalPlayerGate({
  src,
  title,
  onUseInternal,
}: {
  src: string;
  title: string;
  onUseInternal: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
      } catch {
        /* vídeo ainda não pronto */
      }
    });
  }, []);

  const open = (app: ExternalApp) => openInExternalPlayer(src, title, app);

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/92 px-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-vexia-purple/40 bg-[#0B0B0F]/95 p-6 shadow-[0_0_60px_rgb(var(--vexia-primary-rgb)/0.35)]">
        <div className="flex items-center gap-3">
          <ExternalLink className="h-5 w-5 text-vexia-cyan" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Player externo ativo
            </p>
            <h2 className="truncate text-lg font-black text-white">{title}</h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-[#B6B6C2]">
          Escolha em qual aplicativo deseja assistir. Você pode desativar isso em
          Ajustes → Player de Vídeo.
        </p>

        <div className="mt-4 space-y-2">
          {EXTERNAL_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              disabled={!src}
              onClick={() => open(app.id)}
              className="vexia-card-focus flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-vexia-purple/60 hover:bg-white/[0.08] disabled:opacity-40"
            >
              <span className="text-sm font-bold text-white">{app.label}</span>
              <span className="text-[11px] text-[#8A8A99]">{app.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUseInternal}
            className="vexia-card-focus flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-vexia-purple to-vexia-purple-soft px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_24px_rgb(var(--vexia-primary-rgb)/0.5)]"
          >
            <MonitorPlay className="h-4 w-4" /> Usar player VÉXIA
          </button>
          <button
            type="button"
            disabled={!src}
            onClick={() => {
              navigator.clipboard?.writeText(src).then(
                () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                },
                () => setCopied(false),
              );
            }}
            className="vexia-card-focus rounded-2xl border border-white/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#C9C9D6] disabled:opacity-40"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      </div>
    </div>
  );
}
