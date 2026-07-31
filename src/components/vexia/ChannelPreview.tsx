import { useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useResilientPlayer } from "../../hooks/useResilientPlayer";
import { SmartImage } from "./SmartImage";

/**
 * Prévia ao vivo do canal selecionado.
 *
 * Usa o mesmo motor resiliente do player principal (dois motores com troca
 * automática), porém em silêncio e sem controles: é só uma janela de espiada.
 * Clicar na prévia leva para a tela cheia.
 */
export default function ChannelPreview({
  src,
  name,
  logo,
  muted,
  onToggleMuted,
  onOpenFullscreen,
}: {
  src: string | null;
  name: string;
  logo?: string;
  muted: boolean;
  onToggleMuted: () => void;
  onOpenFullscreen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);

  const { activeSlot, buffering, fatalError } = useResilientPlayer({
    videoRef,
    slotARef,
    slotBRef,
    src: src ?? "",
    live: true,
  });

  const showPoster = !src || Boolean(fatalError);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-vexia-purple/50 bg-black shadow-[0_16px_44px_-18px_rgba(0,200,255,0.5)]">
      <button
        type="button"
        aria-label={`Abrir ${name} em tela cheia`}
        onClick={onOpenFullscreen}
        className="vexia-focus block aspect-video w-full bg-black"
      >
        <video
          ref={slotARef}
          className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 ${
            !showPoster && activeSlot === "a" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          playsInline
          muted={activeSlot === "a" ? muted : true}
        />
        <video
          ref={slotBRef}
          className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 ${
            !showPoster && activeSlot === "b" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          playsInline
          muted={activeSlot === "b" ? muted : true}
        />

        {showPoster ? (
          <span className="absolute inset-0 grid place-items-center">
            {logo ? (
              <SmartImage
                src={logo}
                role="logo"
                alt={name}
                eager
                preview={false}
                className="max-h-[55%] max-w-[45%] object-contain drop-shadow-[0_0_22px_rgba(0,200,255,0.35)]"
                fallback={
                  <span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>
                }
              />
            ) : (
              <span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>
            )}
          </span>
        ) : null}

        {src && buffering && !fatalError ? (
          <span className="absolute left-3 top-3 h-5 w-5 animate-spin rounded-full border-2 border-vexia-cyan/30 border-t-vexia-cyan" />
        ) : null}

        <span className="absolute bottom-2 left-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-vexia-cyan">
          {fatalError ? "Sinal indisponível" : "Ao vivo"}
        </span>
      </button>

      <button
        type="button"
        aria-label={muted ? "Ativar som da prévia" : "Silenciar prévia"}
        onClick={onToggleMuted}
        className="vexia-focus absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/70 text-vexia-text"
      >
        {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}
