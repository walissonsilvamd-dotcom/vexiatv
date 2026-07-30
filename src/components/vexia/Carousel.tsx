import { useRef } from "react";
import type { MediaItem } from "../../data/vexia";
import { PosterCard } from "./PosterGrid";

/** Carrossel horizontal premium (D-pad ← →, ↑ ↓ entre carrosséis). */
export function Carousel({
  title,
  icon,
  items,
  kind,
  navRow,
  chips,
  activeChip,
  onChip,
}: {
  title: string;
  icon?: string;
  items: MediaItem[];
  kind: "movie" | "series";
  navRow: number;
  chips?: string[];
  activeChip?: string;
  onChip?: (value: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  if (items.length === 0 && !chips) return null;

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-vexia-purple-soft drop-shadow-[0_0_14px_rgba(123,47,190,0.7)]">
        {icon ? <span aria-hidden>{icon}</span> : null}
        {title}
      </h2>

      {chips ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              tabIndex={0}
              data-nav-row={navRow}
              onClick={() => onChip?.(chip)}
              className={`vexia-focus rounded-full px-3.5 py-1 text-[11px] font-bold transition-all ${
                chip === activeChip
                  ? "bg-vexia-purple text-white shadow-[0_0_16px_rgba(123,47,190,0.65)]"
                  : "border border-vexia-purple/40 bg-[#1A1A1A] text-vexia-text/70 hover:text-white"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div
          ref={railRef}
          className="vexia-fade-edges vexia-smooth-scroll flex gap-3 overflow-x-auto pb-2 vexia-scroll"
        >
          {items.map((item) => (
            <div key={item.id} className="w-[120px] shrink-0 md:w-[150px]">
              <PosterCard item={item} navRow={navRow + 1} kind={kind} />
            </div>
          ))}
        </div>
      ) : (
        <p className="pb-2 text-xs text-vexia-text/50">Nada encontrado para este recorte.</p>
      )}
    </section>
  );
}
