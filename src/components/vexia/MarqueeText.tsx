type Props = {
  text: string;
  className?: string;
  /** Duração da rolagem completa (ida). */
  seconds?: number;
};

/**
 * Nome completo sem reticências: o texto rola suavemente quando o item
 * está focado (D-pad), sob o mouse ou pressionado (toque).
 * O deslocamento usa unidades de container (100cqw), então funciona em
 * qualquer largura sem medir nada em JS.
 */
export function MarqueeText({ text, className = "", seconds = 7 }: Props) {
  return (
    <span
      className={`vexia-marquee min-w-0 flex-1 ${className}`}
      title={text}
      aria-label={text}
    >
      <span
        className="vexia-marquee-text group-hover:[animation:vexia-marquee-run_var(--mq)_ease-in-out_infinite_alternate] group-focus:[animation:vexia-marquee-run_var(--mq)_ease-in-out_infinite_alternate] group-focus-visible:[animation:vexia-marquee-run_var(--mq)_ease-in-out_infinite_alternate] group-focus-within:[animation:vexia-marquee-run_var(--mq)_ease-in-out_infinite_alternate] group-active:[animation:vexia-marquee-run_var(--mq)_ease-in-out_infinite_alternate]"
        style={{ ["--mq" as string]: `${seconds}s` }}
      >
        {text}
      </span>
    </span>
  );
}
