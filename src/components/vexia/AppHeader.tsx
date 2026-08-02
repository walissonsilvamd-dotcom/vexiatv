import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { VexiaLogo } from "./VexiaLogo";

export function AppHeader({ showFilters = true }: { showFilters?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-10">
      <Link to="/home" className="vexia-focus rounded-lg" aria-label=`${BRAND.name} — início`>
        <VexiaLogo className="h-10 md:h-12" />
      </Link>
      <div className="flex items-center gap-2">
        {showFilters ? (
          <Link
            to="/filtros"
            data-nav-row={0}
            tabIndex={0}
            className="vexia-focus grid h-11 w-11 place-items-center md:h-10 md:w-10 rounded-full border border-vexia-cyan/40 bg-vexia-card"
            aria-label="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4 text-vexia-cyan" aria-hidden />
          </Link>
        ) : null}
        <Link
          to="/busca"
          data-nav-row={0}
          tabIndex={0}
          className="vexia-focus grid h-11 w-11 place-items-center md:h-10 md:w-10 rounded-full border border-vexia-cyan/40 bg-vexia-card"
          aria-label="Buscar"
        >
          <Search className="h-4 w-4 text-vexia-cyan" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
