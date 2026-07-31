import { useEffect, useRef, useState } from "react";
import { useResilientPlayer } from "../../hooks/useResilientPlayer";
import { playableStreamUrl } from "../../lib/stream-url";
import { SmartImage } from "./SmartImage";

/**
 * Prévia ao vivo do canal selecionado.
 *
 * Usa o mesmo motor resiliente do player principal (dois motores com troca
 * automática) e com som normal. Clicar na prévia leva para a tela cheia.
 */
export default function ChannelPreview({
  src,
  name,
  logo,
  onOpenFullscreen,
}: {
  src: string | null;
  name: string;
  logo?: string;
  onOpenFullscreen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);
  /** Vira true no primeiro frame realmente exibido: some o "Iniciando prévia". */
  const [started, setStarted] = useState(false);

  // Links http em página https passam pelo proxy do app (conteúdo misto/CORS).
  const playable = src ? playableStreamUrl(src) : "";

  const { activeSlot, buffering, reconnecting, fatalError } = useResilientPlayer({
    videoRef,
    slotARef,
    slotBRef,
    src: playable,
    live: true,
    standby: false,
  });

  useEffect(() => {
    setStarted(false);
    if (!playable) return;
    const mark = () => setStarted(true);
    const nodes = [slotARef.current, slotBRef.current].filter(Boolean) as HTMLVideoElement[];
    for (const n of nodes) n.addEventListener("playing", mark);
    return () => {
      for (const n of nodes) n.removeEventListener("playing", mark);
    };
  }, [playable]);

  /* A prévia sempre usa som; o segundo elemento fica silencioso enquanto inativo. */
  useEffect(() => {
    const active = activeSlot === "a" ? slotARef.current : slotBRef.current;
    const standby = activeSlot === "a" ? slotBRef.current : slotARef.current;
    if (standby) standby.muted = true;
    if (active) {
      active.muted = false;
      active.volume = 1;
      void active.play().catch(() => undefined);
    }
  }, [activeSlot, started]);

  const showPoster = !playable || Boolean(fatalError);
  /* Primeiro clique: mostra o carregamento até o stream aquecer. */
  const starting = Boolean(playable) && !started && !fatalError;
  const showBuffer = Boolean(playable) && !fatalError && (starting || buffering || reconnecting);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-vexia-purple/50 bg-black shadow-[0_16px_44px_-18px_rgb(var(--vexia-secondary-rgb)/0.5)]">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={slotARef}
          className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 ${
            !showPoster && activeSlot === "a" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          playsInline
          autoPlay
          preload="auto"
        />
        <video
          ref={slotBRef}
          className={`absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200 ${
            !showPoster && activeSlot === "b" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          playsInline
          autoPlay
          preload="auto"
          muted
        />

        {showPoster ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            {logo ? (
              <SmartImage
                src={logo}
                role="logo"
                alt={name}
                eager
                preview={false}
                className="max-h-[55%] max-w-[45%] object-contain drop-shadow-[0_0_22px_rgb(var(--vexia-secondary-rgb)/0.35)]"
                fallback={
                  <span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>
                }
              />
            ) : (
              <span className="text-xs tracking-[0.3em] text-vexia-muted">PRÉVIA AO VIVO</span>
            )}
          </span>
        ) : null}

        {showBuffer ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[2px]">
            <span className="flex flex-col items-center gap-2">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-vexia-cyan/25 border-t-vexia-cyan shadow-[0_0_18px_rgb(var(--vexia-secondary-rgb)/0.45)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-vexia-cyan">
                {reconnecting ? "Reconectando" : starting ? "Iniciando prévia" : "Carregando buffer"}
              </span>
            </span>
          </span>
        ) : null}

        {/* Clique na imagem: abre em tela cheia (camada acima do vídeo). */}
        <button
          type="button"
          aria-label={`Abrir ${name} em tela cheia`}
          onClick={onOpenFullscreen}
          className="vexia-focus absolute inset-0 h-full w-full"
        />

        <span className="pointer-events-none absolute bottom-2 left-3 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-vexia-cyan">
          {fatalError ? "Sinal indisponível" : starting ? "Aquecendo" : "Ao vivo"}
        </span>
      </div>

    </div>
  );
}
