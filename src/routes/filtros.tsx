import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Globe2,
  LayoutGrid,
  RotateCcw,
  Shapes,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { EmptyFilterResults } from "../components/vexia/EmptyFilterResults";
import { PosterCard } from "../components/vexia/PosterGrid";
import { TopNav } from "../components/vexia/TopNav";

import { useSpatialNav } from "../hooks/use-spatial-nav";
import {
  FILTER_GROUPS,
  matchesFilters,
  matchesLocalFilters,
  useFilters,
  type FilterKey,
} from "../lib/filters-store";
import { usePlaylist } from "../lib/playlist-store";
import { useTmdbHeroesStatus } from "../lib/use-tmdb";
import { Skeleton } from "../components/ui/skeleton";

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
      { property: "og:url", content: "https://vexiatv.lovable.app/filtros" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/filtros" }],
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
/** Quantos títulos a mais entram na verificação a cada "Aplicar"/"Ver mais". */
const STEP = 60;

function FiltersPage() {
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { filters, set, clear, active } = useFilters();
  const { movies, series, loading } = usePlaylist();
  /** Resultado aplicado aparece na própria tela de filtros (sem trocar de tela). */
  const [applied, setApplied] = useState(false);
  const [limit, setLimit] = useState(SAMPLE);

  /* Base já filtrada pelo que a lista responde sozinha (tipo, gênero, ano, áudio). */
  const localBase = useMemo(
    () =>
      [
        ...movies.map((item) => ({ item, kind: "movie" as const })),
        ...series.map((item) => ({ item, kind: "series" as const })),
      ].filter(({ item, kind }) => matchesLocalFilters(item, kind, filters)),
    [movies, series, filters],
  );

  /* Sem prévia: nada é verificado/baixado antes de APLICAR (leve no APK). */
  const pool = useMemo(
    () => (applied ? localBase.slice(0, limit) : []),
    [applied, localBase, limit],
  );
  const poolMovies = useMemo(
    () => pool.filter((p) => p.kind === "movie").map((p) => p.item),
    [pool],
  );
  const poolSeries = useMemo(
    () => pool.filter((p) => p.kind === "series").map((p) => p.item),
    [pool],
  );

  /* Cada troca de filtro reinicia a verificação. */
  useEffect(() => {
    setLimit(SAMPLE);
    setApplied(false);
  }, [filters]);

  // Amostra enriquecida pelo TMDB para a prévia do resultado.
  const {
    items: richMovies,
    pending: pendingMovies,
    settled: settledMovies,
    total: totalMovies,
  } = useTmdbHeroesStatus(poolMovies, "movie");
  const {
    items: richSeries,
    pending: pendingSeries,
    settled: settledSeries,
    total: totalSeries,
  } = useTmdbHeroesStatus(poolSeries, "series");

  const isBusy = applied && (loading || pendingMovies || pendingSeries);
  const tmdbProgress = Math.round(
    ((settledMovies + settledSeries) / (totalMovies + totalSeries || 1)) * 100,
  );

  const results = useMemo(() => {
    const list = [
      ...richMovies.map((m) => ({ item: m, kind: "movie" as const })),
      ...richSeries.map((s) => ({ item: s, kind: "series" as const })),
    ];
    return list.filter(({ item, kind }) => matchesFilters(item, kind, filters));
  }, [richMovies, richSeries, filters]);


  const apply = () => {
    // Canais não têm card de pôster: esse tipo continua abrindo a tela de canais.
    if (filters.tipo === "Canais") {
      navigate({ to: "/canais" });
      return;
    }
    setApplied(true);
    setLimit((l) => Math.max(l, SAMPLE) + STEP);
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-5 py-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/home"
            data-nav-row={0}
            tabIndex={0}
            title="Voltar"
            aria-label="Voltar"
            className="vexia-focus grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:text-vexia-cyan"
          >
            <ArrowLeft className="h-3 w-3 shrink-0" />
          </Link>
          <TopNav className="w-fit min-w-0 overflow-x-auto [&>a]:px-2.5 [&>a]:py-1 [&>a]:text-[10px] sm:[&>a]:px-3 sm:[&>a]:py-1.5 sm:[&>a]:text-[11px]" />
        </div>
      </header>

      <div className="grid gap-x-4 gap-y-1 px-5 md:px-8 xl:grid-cols-2">
        <div className="col-span-full mb-1 flex items-center justify-between">
          <button
            type="button"
            data-nav-row={1}
            tabIndex={0}
            onClick={clear}
            className="vexia-focus inline-flex items-center gap-1.5 rounded-lg bg-vexia-purple/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-vexia-cyan hover:bg-vexia-purple/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
          <span className="text-[10px] font-bold text-vexia-text/60">{active} ativos</span>
        </div>
        {FILTER_GROUPS.map((group, gi) => {
          const Icon = ICONS[group.key];
          return (
            <section
              key={group.key}
              className="grid items-start gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1 sm:flex sm:items-center sm:gap-2"
            >
              <h2 className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-vexia-purple-soft">
                <Icon className="h-3.5 w-3.5 shrink-0 text-vexia-purple" aria-hidden />
                {group.title}
              </h2>
              <div className="flex min-w-0 flex-wrap gap-1">
                {group.options.map((opt) => {
                  const isActive = filters[group.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      data-nav-row={gi + 2}
                      tabIndex={0}
                      onClick={() => set(group.key, opt)}
                      className={`vexia-focus shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        isActive
                          ? "bg-vexia-purple text-white shadow-[0_0_10px_rgb(var(--vexia-primary-rgb)/0.7)]"
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

      {/* Resultado — só depois de APLICAR (sem prévia, para não pesar no APK) */}
      {applied ? (
        <section
          ref={resultsRef}
          className="no-scrollbar mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 md:px-8"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-vexia-cyan">
              Resultado ({results.length})
            </h2>
            {isBusy ? (
              <span className="animate-pulse text-[10px] font-bold text-vexia-purple-soft">
                {loading ? "Carregando lista…" : `Verificando ${tmdbProgress}%`}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-vexia-text/50">
                Conferidos {pool.length} de {localBase.length} títulos
              </span>
            )}
          </div>
          {isBusy ? (
            <div className="grid grid-cols-4 gap-2 md:grid-cols-8 xl:grid-cols-10">
              {Array.from({ length: 16 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-[2/3] rounded-xl border border-vexia-purple/20 bg-white/10"
                />
              ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2 md:grid-cols-8 xl:grid-cols-10">
                {results.map(({ item, kind }) => (
                  <PosterCard key={`${kind}-${item.id}`} item={item} navRow={90} kind={kind} />
                ))}
              </div>
              {pool.length < localBase.length ? (
                <div className="flex justify-center pb-2 pt-1">
                  <button
                    type="button"
                    data-nav-row={95}
                    tabIndex={0}
                    onClick={() => setLimit((l) => l + STEP)}
                    className="vexia-focus rounded-full border border-vexia-purple/50 bg-black/50 px-6 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-vexia-cyan"
                  >
                    Ver mais resultados
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyFilterResults
              noun="resultado"
              hasFilters={active > 0}
              hasQuery={undefined}
              onClear={() => clear()}
            />
          )}
        </section>
      ) : (
        <section className="mt-3 flex flex-1 items-center justify-center px-5 text-center md:px-8">
          <p className="max-w-md text-[11px] font-bold uppercase tracking-[0.18em] text-vexia-text/50">
            Escolha os filtros e toque em <span className="text-vexia-cyan">APLICAR</span> para
            carregar os resultados
          </p>
        </section>
      )}


      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 overflow-hidden border-t border-white/10 bg-black/90 px-3 py-2 backdrop-blur sm:gap-4 sm:px-5 md:px-8">
        <p className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-vexia-cyan sm:text-[10px]">
          ▸ {active} ativos
        </p>
        <span className="min-w-0 flex-1 truncate text-center text-[10px] font-black uppercase tracking-[0.2em] text-vexia-purple drop-shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.9)] sm:text-[11px]">
          Filtros
        </span>
        <button
          type="button"
          data-nav-row={99}
          tabIndex={0}
          onClick={apply}
          className="vexia-focus shrink-0 rounded-full bg-vexia-purple px-5 py-2 text-[10px] font-black tracking-[0.16em] shadow-[0_0_24px_rgb(var(--vexia-primary-rgb)/0.6)] sm:px-8 sm:text-[11px]"
        >
          APLICAR
        </button>
      </div>

    </main>
  );
}
