import { ArrowDownWideNarrow } from "lucide-react";
import { SORT_OPTIONS, useSort, type SortKey } from "../../lib/filters-store";

/** Controle de ordenação (Relevância / Nota TMDB / Mais recentes). */
export function SortControl({
  navRow = 0,
  labels,
}: {
  navRow?: number;
  /** Rótulos alternativos por chave (ex.: canais não têm nota TMDB). */
  labels?: Partial<Record<SortKey, string>>;
}) {
  const { sort, setSort } = useSort();

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-xl">
      <ArrowDownWideNarrow className="ml-2 h-4 w-4 shrink-0 text-vexia-cyan" aria-hidden />
      <span className="sr-only">Ordenar resultados por</span>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          tabIndex={0}
          data-nav-row={navRow}
          aria-pressed={sort === opt.key}
          onClick={() => setSort(opt.key)}
          className={`vexia-focus whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
            sort === opt.key
              ? "bg-vexia-purple text-white shadow-[0_0_16px_rgba(123,47,190,0.6)]"
              : "text-vexia-text/65 hover:text-white"
          }`}
        >
          {labels?.[opt.key] ?? opt.label}
        </button>
      ))}
    </div>
  );
}
