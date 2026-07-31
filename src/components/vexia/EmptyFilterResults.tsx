import { Link } from "@tanstack/react-router";
import { SlidersHorizontal, Trash2 } from "lucide-react";

export function EmptyFilterResults({
  noun,
  hasFilters,
  hasQuery,
  onClear,
}: {
  noun: string;
  hasFilters?: boolean;
  hasQuery?: boolean;
  onClear?: () => void;
}) {
  const title = hasFilters
    ? `NENHUM ${noun.toUpperCase()} COM ESTES FILTROS`
    : hasQuery
      ? `NENHUM RESULTADO PARA "${hasQuery.toUpperCase()}"`
      : `LISTA M3U VAZIA`;

  const description = hasFilters
    ? "Nenhum item da sua lista M3U bate com os filtros ativos. Ajuste os critérios para encontrar mais conteúdo."
    : hasQuery
      ? "Tente outro termo de busca ou limpe a pesquisa para ver tudo."
      : "Sua lista está carregada, mas não há itens nesta seção. Verifique a lista ou tente outro tipo de conteúdo.";

  return (
    <div className="grid place-items-center rounded-2xl border border-vexia-purple/30 bg-vexia-card/60 px-6 py-14 text-center">
      <SlidersHorizontal className="h-8 w-8 text-vexia-purple-soft" aria-hidden />
      <p className="mt-3 text-sm font-black tracking-wide text-vexia-text">{title}</p>
      <p className="mt-2 max-w-md text-xs text-vexia-muted">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/filtros"
          className="vexia-focus rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-[0_0_18px_rgba(123,47,190,0.45)]"
        >
          AJUSTAR FILTROS
        </Link>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="vexia-focus inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold tracking-wide text-vexia-text hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            LIMPAR
          </button>
        ) : null}
      </div>
    </div>
  );
}
