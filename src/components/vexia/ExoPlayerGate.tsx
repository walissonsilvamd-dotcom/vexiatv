import { ArrowLeft, Cpu, MonitorPlay } from "lucide-react";
import { useEffect } from "react";
import { BRAND } from "../../lib/brand";

/**
 * Tela exibida enquanto o ExoPlayer nativo está reproduzindo por cima do app.
 * O vídeo aparece na camada nativa; aqui ficam só os atalhos de Voltar e a
 * opção de cair para o player web interno (alternativa).
 */
export function ExoPlayerGate({
  title,
  onBack,
  onUseWeb,
}: {
  title: string;
  onBack: () => void;
  onUseWeb: () => void;
}) {
  /* Nada toca no navegador enquanto o motor nativo estiver no ar. */
  useEffect(() => {
    document.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
      } catch {
        /* vídeo ainda não pronto */
      }
    });
  }, []);

  return (
    <div className="absolute inset-0 z-[80] flex items-end justify-between bg-transparent p-6">
      <button
        type="button"
        onClick={onBack}
        className="vexia-card-focus flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-5 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-vexia-purple/40 bg-black/60 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-vexia-cyan backdrop-blur">
          <Cpu className="h-4 w-4" /> ExoPlayer
        </span>
        <button
          type="button"
          onClick={onUseWeb}
          className="vexia-card-focus flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-5 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur"
          title={title}
        >
          <MonitorPlay className="h-4 w-4" /> Player {BRAND.shortName}
        </button>
      </div>
    </div>
  );
}
