import { AUDIO_TAG_LABEL, detectAudioTag } from "../../lib/audio-tag";

type Props = {
  /** Textos onde procurar a marcação (título, grupo, categoria...). */
  sources: (string | undefined | null)[];
  /**
   * Textos usados só quando o próprio item não traz marcação — normalmente o
   * título/grupo da série, que costuma carregar o "DUBLADO"/"LEGENDADO".
   */
  fallbackSources?: (string | undefined | null)[];
  /** Mostra um selo neutro "N/D" quando não há marcação detectável. */
  alwaysShow?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/** Selo DUBL / LEG exibido nos cards, no destaque e na frente de cada episódio. */
export function AudioTagBadge({
  sources,
  fallbackSources,
  alwaysShow = false,
  size = "sm",
  className = "",
}: Props) {
  const tag =
    detectAudioTag(...sources) ??
    (fallbackSources ? detectAudioTag(...fallbackSources) : null);
  const dimsEarly = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]";
  if (!tag) {
    if (!alwaysShow) return null;
    return (
      <span
        title="Áudio não informado na lista"
        aria-label="Áudio não informado"
        className={`inline-flex shrink-0 items-center rounded-md border border-white/20 bg-black/60 font-black tracking-[0.08em] text-white/55 backdrop-blur-sm ${dimsEarly} ${className}`}
      >
        N/D
      </span>
    );
  }
  const tone =
    tag === "DUBL"
      ? "border-vexia-purple/60 bg-vexia-purple/25 text-white"
      : tag === "LEG"
        ? "border-vexia-cyan/60 bg-vexia-cyan/15 text-vexia-cyan"
        : "border-vexia-gold/60 bg-vexia-gold/15 text-vexia-gold";
  const dims = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]";
  return (
    <span
      title={AUDIO_TAG_LABEL[tag]}
      aria-label={AUDIO_TAG_LABEL[tag]}
      className={`inline-flex shrink-0 items-center rounded-md border font-black tracking-[0.08em] backdrop-blur-sm ${tone} ${dims} ${className}`}
    >
      {tag}
    </span>
  );
}
