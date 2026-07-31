import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  Globe2,
  LayoutGrid,
  Shapes,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { useMemo, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { PosterCard } from "../components/vexia/PosterGrid";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import {
  FILTER_GROUPS,
  matchesFilters,
  useFilters,
  type FilterKey,
} from "../lib/filters-store";
import { usePlaylist } from "../lib/playlist-store";
import { useTmdbHeroes } from "../lib/use-tmdb";

export const Route = createFileRoute("/filtros")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Filtros inteligentes" },
      {
        name: "description",
        content:
          "Refine o catálogo do VÉXIA TV por tipo, gênero, ano, país, áudio, nota TMDB, duração e lançamento.",
      },
      { property: "og:title", content: "VÉXIA TV — Filtros inteligentes" },
      {
        property: "og:description",
        content: "Filtros cumulativos sobre a sua lista M3U, enriquecidos pelo TMDB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FiltersPage,
});

const ICONS: Record<FilterKey, LucideIcon> = {
  tipo: LayoutGrid,
  genero: Shapes,
  ano: CalendarDays,
  pais: Globe2,
  audio: Volume2,
  nota: Star,
  duracao: Clock3,
  lancamento: Sparkles,
};

const SAMPLE = 40;

function FiltersPage() {
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { filters, set, clear, active } = useFilters();
  const { movies, series } = usePlaylist();

  // Amostra enriquecida pelo TMDB para a prévia do resultado.
  const richMovies = useTmdbHeroes(useMemo(() => movies.slice(0, SAMPLE), [movies]), "movie");
  const richSeries = useTmdbHeroes(useMemo(() => series.slice(0, SAMPLE / 2), [series]), "series");

  const preview = useMemo(() => {
    const list = [
      ...richMovies.map((m) => ({ item: m, kind: "movie" as const })),
      ...richSeries.map((s) => ({ item: s, kind: "series" as const })),
    ];
    return list.filter(({ item, kind }) => matchesFilters(item, kind, filters)).slice(0, 16);
  }, [richMovies, richSeries, filters]);

  const apply = () => {
    if (filters.tipo === "Séries") navigate({ to: "/series" });
    else if (filters.tipo === "Canais") navigate({ to: "/canais" });
    else navigate({ to: "/filmes" });
  };

  return (
    <main
      ref={scopeRef}
      className="vexia-safe flex min-h-screen flex-col overflow-hidden bg-vexia-bg pb-16 text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,5,0.9), rgba(5,5,5,0.96)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex flex-wrap items-center gap-3 px-5 py-2 md:px-8">
        <TopNav className="w-fit" />
        <h1 className="text-base font-black uppercase tracking-[0.2em] text-vexia-purple-soft drop-shadow-[0_0_16px_rgba(123,47,190,0.8)]">
          Filtros
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={clear}
            className="vexia-focus rounded-full border border-vexia-cyan/40 px-4 py-1 text-[10px] font-bold text-vexia-cyan"
          >
            LIMPAR
          </button>
          <VexiaLogo className="h-8" />
        </div>
      </header>

      <div className="grid gap-x-6 gap-y-1.5 px-5 md:px-8 xl:grid-cols-2">
        {FILTER_GROUPS.map((group, gi) => {
          const Icon = ICONS[group.key];
          return (
            <section
              key={group.key}
              className="grid items-start gap-2 md:grid-cols-[130px_minmax(0,1fr)]"
            >
              <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-vexia-purple-soft md:justify-end md:pt-1">
                <Icon className="h-3.5 w-3.5 shrink-0 text-vexia-purple" aria-hidden />
                {group.title}
              </h2>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {group.options.map((opt) => {
                  const isActive = filters[group.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-nav-row={gi + 1}
                      tabIndex={0}
                      onClick={() => set(group.key, opt)}
                      className={`vexia-focus shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                        isActive
                          ? "bg-vexia-purple text-white shadow-[0_0_14px_rgba(123,47,190,0.7)]"
                          : "border border-vexia-purple/40 bg-[#1A1A1A] text-[#B0B0B0] hover:text-white"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Prévia do resultado */}
      <section className="mt-3 min-h-0 flex-1 space-y-1.5 px-5 md:px-8">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-vexia-cyan">
          Prévia do resultado
        </h2>
        {preview.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8 xl:grid-cols-10">
            {preview.map(({ item, kind }) => (
              <PosterCard key={`${kind}-${item.id}`} item={item} navRow={90} kind={kind} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-vexia-text/55">
            Nenhum título da amostra combina com estes filtros. Ajuste os critérios ou carregue uma
            lista maior no menu LISTAS.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-white/10 bg-black/90 px-5 py-2 backdrop-blur md:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-vexia-cyan">
          ▸ {active} filtros ativos
        </p>
        <button
          type="button"
          data-nav-row={99}
          tabIndex={0}
          onClick={apply}
          className="vexia-focus rounded-full bg-vexia-purple px-8 py-2 text-[11px] font-black tracking-[0.16em] shadow-[0_0_24px_rgba(123,47,190,0.6)]"
        >
          APLICAR
        </button>
      </div>

    </main>
  );
}
