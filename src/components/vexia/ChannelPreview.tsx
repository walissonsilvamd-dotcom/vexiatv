import { memo, useEffect, useRef, useState } from "react";
import { useResilientPlayer } from "../../hooks/useResilientPlayer";
import { playableStreamUrl } from "../../lib/stream-url";
import { SmartImage } from "./SmartImage";

/**
 * Prévia ao vivo do canal selecionado.
 *
 * Usa o mesmo motor resiliente do player principal (dois motores com troca
 * automática) e com som normal. Clicar na prévia leva para a tela cheia.
 */
function ChannelPreviewBase({
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
    // Prévia leve: faixa mais baixa da lista e buffer curto = abre na hora.
    preview: true,
  });

  /**
   * Troca de canal: o stream anterior é cortado IMEDIATAMENTE (pausa + libera
   * o elemento), então a TV não fica baixando dois canais ao mesmo tempo.
   */
  useEffect(() => {
    return () => {
      for (const node of [slotARef.current, slotBRef.current]) {
        if (!node) continue;
        try {
          node.pause();
          node.removeAttribute("src");
          node.load();
        } catch {
          /* elemento já desmontado */
        }
      }
    };
  }, [playable]);

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
    if (active && playable) {
      active.muted = false;
      active.volume = 1;
      // Reduzi o delay para play() na prévia para aumentar a percepção de velocidade
      const timer = setTimeout(() => {
        if (!active || !playable) return;
        void active.play().catch(() => {
          active.muted = true;
          void active.play().catch(() => undefined);
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSlot, started, playable]);

  const showPoster = !playable || Boolean(fatalError);
  /* Primeiro clique: mostra o carregamento até o stream aquecer. */
  const starting = Boolean(playable) && !started && !fatalError;
  const showBuffer = Boolean(playable) && !fatalError && (starting || buffering || reconnecting);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
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
                className="max-h-[55%] max-w-[45%] object-contain drop-shadow-[0_0_22px_rgba(255,255,255,0.2)]"
                fallback={
                  <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white shadow-[0_0_18px_rgba(255,255,255,0.2)]" />
                }
              />
            ) : (
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white shadow-[0_0_18px_rgba(255,255,255,0.2)]" />
            )}
          </span>
        ) : null}

        {/* Placeholder (skeleton) com transição curta enquanto a prévia troca. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
            showBuffer ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="vexia-preview-skeleton absolute inset-0" />
        </span>

        {showBuffer ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-200">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white shadow-[0_0_18px_rgba(255,255,255,0.2)]" />
          </span>
        ) : null}

        {/* Clique na imagem: abre em tela cheia (camada acima do vídeo). */}
        <button
          type="button"
          aria-label={`Abrir ${name} em tela cheia`}
          onClick={onOpenFullscreen}
          className="vexia-focus absolute inset-0 h-full w-full"
        />
      </div>

    </div>
  );
}

/**
 * Memoizado: a prévia só re-renderiza quando o canal (url/nome/logo) muda.
 * Sem isso, cada tique do EPG ou movimento de foco na lista re-renderizava o
 * player inteiro e a imagem engasgava.
 */
const ChannelPreview = memo(ChannelPreviewBase);
export default ChannelPreview;
