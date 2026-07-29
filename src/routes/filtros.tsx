import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Chip } from "../components/vexia/Chips";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { filterGroups } from "../data/vexia-catalog";

export const Route = createFileRoute("/filtros")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Filtros" },
      {
        name: "description",
        content: "Filtre o catálogo do VÉXIA TV por tipo, gênero, ano, país, áudio e mais.",
      },
      { property: "og:title", content: "VÉXIA TV — Filtros" },
      { property: "og:description", content: "Filtros avançados do catálogo VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FiltersPage,
});

const initial = Object.fromEntries(filterGroups.map((g) => [g.title, "Todos"]));

function FiltersPage() {
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [values, setValues] = useState<Record<string, string>>(initial);

  const activeCount = Object.values(values).filter((v) => v !== "Todos").length;

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-32 text-vexia-text">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-vexia-bg/95 px-5 py-4 backdrop-blur md:px-10">
        <h1 className="text-xl font-black tracking-wide text-vexia-purple-soft">FILTROS</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => setValues(initial)}
            className="vexia-focus rounded-full border border-vexia-cyan/50 px-5 py-2 text-[11px] font-bold text-vexia-cyan"
          >
            LIMPAR
          </button>
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => navigate({ to: "/home" })}
            className="vexia-focus rounded-full bg-vexia-purple px-6 py-2 text-[11px] font-bold"
          >
            OK
          </button>
        </div>
      </header>

      <div className="space-y-6 px-5 md:px-10">
        {filterGroups.map((group, gi) => (
          <section key={group.title} className="space-y-2">
            <h2 className="text-xs font-black tracking-[0.2em] text-vexia-purple-soft">
              {group.title}
            </h2>
            <div className="flex flex-wrap gap-2">
              {group.options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  active={values[group.title] === opt}
                  navRow={gi + 1}
                  onClick={() => setValues((v) => ({ ...v, [group.title]: opt }))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t border-white/10 bg-black/90 px-5 py-3 backdrop-blur md:px-10">
        <p className="text-center text-[11px] font-semibold text-vexia-cyan">
          {activeCount} FILTROS ATIVOS
        </p>
        <button
          type="button"
          data-nav-row={99}
          tabIndex={0}
          onClick={() => navigate({ to: "/home" })}
          className="vexia-focus w-full rounded-full bg-vexia-purple py-3 text-xs font-black tracking-wide"
        >
          APLICAR
        </button>
      </div>
    </main>
  );
}
