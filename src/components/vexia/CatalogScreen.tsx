import { Link } from "@tanstack/react-router";
import { ChevronDown, Clock, Search, Undo2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import nebula from "../../assets/nebula-bg.jpg.asset.json";
import type { MediaItem } from "../../data/vexia";
import { useSpatialNav } from "../../hooks/use-spatial-nav";
import { useDebounce } from "../../hooks/useDebounce";
import { buildSearchIndex, queryIndex } from "../../utils/search-index";
import { VirtualizedGrid } from "../VirtualizedGrid";
import {
  activeFilterChips,
  clearFilters,
  matchesFilters,
  matchesLocalFilters,
  needsTmdb,
  sortMedia,
  useFilters,
  useSort,
} from "../../lib/filters-store";

import { SortControl } from "./SortControl";
import { useTmdbHeroesStatus } from "../../lib/use-tmdb";
import { preloadImages } from "../../lib/image";
import { EmptyFilterResults } from "./EmptyFilterResults";
import { EmptyPlaylist } from "./EmptyPlaylist";
import { PlaylistErrorState } from "./PlaylistErrorState";
import { PosterCard } from "./PosterGrid";
import { QrPlaylistDialog } from "./QrPlaylistDialog";
import { TopNav } from "./TopNav";
import { PinPrompt } from "./PinPrompt";
import { isAdultText, useParentalUnlocked } from "../../lib/parental";
import { useSettings } from "../../lib/settings-store";
import { VexiaLogo } from "./VexiaLogo";

const PAGE = 24;
/** Acima deste total a grade passa a ser virtualizada (só o visível é montado). */
const VIRTUALIZE_FROM = 60;
const GRID_CLASS = "grid grid-cols-3 gap-4 md:grid-cols-4 xl:grid-cols-6";


export function CatalogScreen(props: {
  kind: "movie" | "series";
  items: MediaItem[];
  categories: string[];
  activeTab: "Filmes" | "Séries";
}) {
  const { kind, activeTab } = props;
  let items = props.items;
  let categories = props.categories;
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);
  const { filters, active: activeFilters } = useFilters();
  /* Ajustes → Controle dos Pais / Ocultar Categorias. */
  const { settings } = useSettings();
  const unlockedAdult = useParentalUnlocked();
  const [pinOpen, setPinOpen] = useState(false);
  const blockAdult = settings.parentalEnabled && !unlockedAdult;
  const allItems = items;
  items = useMemo(
    () =>
      blockAdult
        ? allItems.filter((item) => !isAdultText(item.title, item.category, ...item.genres))
        : allItems,
    [allItems, blockAdult],
  );
  const hasBlocked = blockAdult && items.length !== allItems.length;
  categories = useMemo(
    () => (blockAdult ? categories.filter((cat) => !isAdultText(cat)) : categories),
    [categories, blockAdult],
  );
  const { sort } = useSort();

  const noun = kind === "series" ? "séries" : "filmes";

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.genres[0] ?? "Sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [items]);

  /* Índice de busca criado uma vez por lista — suporta 20.000+ títulos. */
  const index = useMemo(
    () =>
      buildSearchIndex(items, {
        id: (item) => item.id,
        name: (item) => item.title,
        category: (item) => item.category ?? "",
        genre: (item) => item.genres.join(" "),
        year: (item) => item.year,
      }),
    [items],
  );

  const debouncedQuery = useDebounce(query, 250);

  /* 1) Busca + categoria da barra lateral. */
  const searched = useMemo(() => {
    const base = debouncedQuery.trim() ? queryIndex(index, debouncedQuery) : items;
    return category === "Todos" ? base : base.filter((item) => item.genres[0] === category);
  }, [index, items, debouncedQuery, category]);

  /* 2) Filtros da Home que a lista já responde — aplicados ao catálogo inteiro. */
  const filtered = useMemo(
    () =>
      activeFilters === 0
        ? searched
        : searched.filter((item) => matchesLocalFilters(item, kind, filters)),
    [searched, activeFilters, filters, kind],
  );

  /* 3) Ordenação aplicada ao catálogo filtrado INTEIRO, antes de paginar.
     O valor adiado evita travar a interface enquanto a nova ordem é calculada. */
  const deferredSort = useDeferredValue(sort);
  const sortBusy = deferredSort !== sort;
  const sorted = useMemo(() => sortMedia(filtered, deferredSort), [filtered, deferredSort]);

  /* 4) Critérios TMDB (país, nota, duração, lançamento) na página carregada. */
  const tmdbNeeded = activeFilters > 0 && needsTmdb(filters);
  const page = useMemo(() => sorted.slice(0, limit), [sorted, limit]);
  const {
    items: enriched,
    pending: tmdbPending,
    settled: tmdbSettled,
    total: tmdbTotal,
  } = useTmdbHeroesStatus(tmdbNeeded ? page : [], kind);
  const visible = useMemo(() => {
    const base = tmdbNeeded
      ? enriched.filter((item) => matchesFilters(item, kind, filters))
      : page;
    return sortMedia(base, deferredSort);
  }, [tmdbNeeded, page, enriched, filters, kind, deferredSort]);
  /* Sem critérios TMDB, a lista filtrada inteira é exibida virtualizada. */
  const virtualItems = useMemo(() => (tmdbNeeded ? [] : sorted), [tmdbNeeded, sorted]);
  const useVirtual = !tmdbNeeded && virtualItems.length > VIRTUALIZE_FROM;

  /* Enquanto a verificação TMDB roda, a contagem final ainda não é confiável. */
  const countBusy = sortBusy || (tmdbNeeded && tmdbPending);
  /* Mantém o último número estável em tela para não haver salto brusco. */
  const lastCount = useRef(0);
  if (!countBusy) lastCount.current = tmdbNeeded ? visible.length : filtered.length;
  const shownCount = countBusy ? lastCount.current : tmdbNeeded ? visible.length : filtered.length;

  /* A paginação recomeça sempre que o conjunto ou a ordem muda. */
  useEffect(() => {
    setLimit(PAGE);
  }, [category, debouncedQuery, deferredSort, activeFilters, filters]);

  const hasContent = items.length > 0;

  // Pré-carrega os primeiros pôsteres para a grade aparecer instantaneamente.
  useEffect(() => {
    const first = sorted.slice(0, 12).map((item) => item.poster).filter(Boolean) as string[];
    if (first.length) preloadImages(first, "poster");
  }, [sorted]);


  return (
    <>
    <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} />
    <main
      ref={scopeRef}
      className="vexia-safe relative flex h-screen max-h-screen flex-col overflow-hidden bg-vexia-bg text-vexia-text"
      style={{
        height: "100dvh",
        backgroundImage: `linear-gradient(rgba(5,5,5,0.82), rgba(5,5,5,0.92)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Barra superior — compacta, para sobrar espaço à lista e aos cards */}
      <header className="flex h-12 shrink-0 items-center gap-3 px-5 md:px-7">
        <TopNav active={activeTab} />

        <label className="relative min-w-[160px] flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            data-nav-row={0}
            tabIndex={0}
            placeholder={`Buscar ${noun}`}
            aria-label={`Buscar ${noun}`}
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2 pl-10 pr-4 text-sm text-vexia-text placeholder:text-vexia-text/45 backdrop-blur-xl outline-none"
          />
        </label>

        <SortControl navRow={0} />

        <div className="ml-auto shrink-0">
          <VexiaLogo className="h-8" />
        </div>
      </header>

      {hasContent ? (
        <div className="grid min-h-0 flex-1 gap-4 px-5 pb-3 md:px-7 lg:grid-cols-[clamp(220px,20vw,300px)_minmax(0,1fr)]">
          {/* Coluna esquerda — a LISTA é o elemento principal da tela */}
          <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-[#141414]/90 to-[#0A0A0A]/90 p-2.5 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,1)]">
            <h1 className="shrink-0 px-1 text-base font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.85)]">
              {kind === "series" ? "Séries" : "Filmes"}
            </h1>
            <p className="shrink-0 px-1 text-[10px] font-medium uppercase tracking-widest text-vexia-cyan/80">
              {items.length} {noun} na sua lista
            </p>
            <div className="my-2 h-px shrink-0 bg-white/10" />

            <div className="flex items-center justify-between gap-2">
              <Link
                to="/home"
                data-nav-row={1}
                tabIndex={0}
                className="vexia-focus flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-vexia-text hover:bg-white/5"
              >
                <Undo2 className="h-4 w-4 text-vexia-cyan" aria-hidden /> Voltar
              </Link>
              <button
                type="button"
                data-nav-row={1}
                tabIndex={0}
                onClick={() =>
                  (scopeRef.current?.querySelector("input") as HTMLInputElement | null)?.focus()
                }
                className="vexia-focus flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-vexia-text hover:bg-white/5"
              >
                <Search className="h-4 w-4 text-vexia-cyan" aria-hidden /> Procurar
              </button>
            </div>
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-vexia-text/80">
              <Clock className="h-4 w-4 text-vexia-cyan" aria-hidden />
              <span className="flex-1">Visualizado recentemente</span>
            </div>

            {settings.hideCategories ? (
              <p className="mt-2 rounded-xl bg-black/30 px-3 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-vexia-text/60">
                Categorias ocultas em Ajustes
              </p>
            ) : (
            <ul className="no-scrollbar mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const active = cat === category;
                const count = cat === "Todos" ? items.length : (counts.get(cat) ?? 0);
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      data-nav-row={2}
                      tabIndex={0}
                      onClick={() => {
                        setCategory(cat);
                        setLimit(PAGE);
                      }}
                      className={`vexia-focus flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                        active
                          ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/60 font-bold text-white shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.55)]"
                          : "bg-[#1A1A1A]/70 font-medium text-vexia-text hover:bg-white/10"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className={active ? "text-white" : "text-vexia-text/50"}>{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}
            {hasBlocked ? (
              <button
                type="button"
                onClick={() => setPinOpen(true)}
                className="vexia-focus mt-3 w-full rounded-xl border border-vexia-purple/40 bg-black/40 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-vexia-cyan"
              >
                Liberar conteúdo adulto
              </button>
            ) : null}
          </aside>

          {/* Coluna direita */}
          <section className="flex min-h-0 flex-col gap-2.5">
            <div className="flex shrink-0 items-end justify-between">
              <div>
                <h1 className="text-lg font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.85)]">
                  {kind === "series" ? "Séries" : "Filmes"}
                </h1>
                <p className="text-[11px] font-medium uppercase tracking-widest text-vexia-cyan/80">
                  {items.length} {noun} na sua lista
                </p>
              </div>
              <div
                aria-live="polite"
                aria-busy={countBusy}
                className="flex flex-col items-end gap-0.5 text-right"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-vexia-text/85">
                  {countBusy ? (
                    <span className="flex items-center gap-2 text-vexia-cyan/90">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-vexia-purple/40 border-t-vexia-cyan" />
                      {sortBusy
                        ? "Reordenando…"
                        : `Consultando TMDB ${tmdbSettled}/${tmdbTotal}…`}
                    </span>
                  ) : tmdbNeeded ? (
                    <>
                      {shownCount} {shownCount === 1 ? noun.slice(0, -1) : noun} encontrados
                    </>
                  ) : (
                    <>
                      {category} ({shownCount})
                    </>
                  )}
                  <span
                    className={`h-2 w-2 rounded-full shadow-[0_0_10px_rgb(var(--vexia-primary-rgb)/0.9)] ${
                      countBusy ? "animate-pulse bg-vexia-cyan" : "bg-vexia-purple"
                    }`}
                  />
                </span>
                {!countBusy ? (
                  <span className="text-[11px] font-medium text-vexia-text/55">
                    {tmdbNeeded
                      ? `Critérios do TMDB conferidos em ${page.length} de ${filtered.length} títulos${
                          page.length < filtered.length ? " — carregue mais para conferir o resto" : ""
                        }`
                      : activeFilters > 0
                        ? `Filtrados da sua lista (${items.length} no total) — sem consulta ao TMDB`
                        : `Direto da sua lista (${items.length} no total)`}
                  </span>
                ) : null}
              </div>


            </div>

            {/* Filtros vindos do menu FILTROS da Home */}
            {activeFilters > 0 ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-vexia-purple/30 bg-black/50 px-3 py-2 backdrop-blur-xl">
                <span className="text-[11px] font-bold uppercase tracking-widest text-vexia-cyan/90">
                  Filtros da Home
                </span>
                {activeFilterChips(filters).map((chip) => (
                  <span
                    key={chip.key}
                    className="rounded-full border border-vexia-purple/50 bg-vexia-purple/20 px-3 py-1 text-xs font-semibold text-white shadow-[0_0_14px_rgb(var(--vexia-primary-rgb)/0.35)]"
                  >
                    {chip.title}: {chip.value}
                  </span>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    to="/filtros"
                    data-nav-row={2}
                    tabIndex={0}
                    className="vexia-focus rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-vexia-text hover:bg-white/10"
                  >
                    Ajustar
                  </Link>
                  <button
                    type="button"
                    data-nav-row={2}
                    tabIndex={0}
                    onClick={() => clearFilters()}
                    className="vexia-focus rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-vexia-text hover:bg-white/10"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            ) : null}


            <div
              className={`no-scrollbar min-h-0 flex-1 overflow-y-auto transition-opacity duration-200 ${countBusy ? "opacity-60" : "opacity-100"}`}
            >
              {useVirtual ? (
                <VirtualizedGrid
                  items={virtualItems}
                  height="100%"
                  gridClassName={GRID_CLASS}
                  keyFor={(item) => item.id}
                  renderItem={(item) => <PosterCard item={item} navRow={3} kind={kind} />}
                />

              ) : visible.length > 0 ? (
                <div className={GRID_CLASS}>
                  {visible.map((item) => (
                    <PosterCard key={item.id} item={item} navRow={3} kind={kind} />
                  ))}
                </div>
              ) : countBusy ? (
                /* Nada de "nenhum resultado" enquanto a ordenação/verificação roda. */
                <div className={GRID_CLASS} aria-hidden>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[2/3] animate-pulse rounded-xl border border-vexia-purple/20 bg-white/5"
                    />
                  ))}
                </div>
              ) : (
                <EmptyFilterResults
                  noun={noun}
                  hasFilters={activeFilters > 0}
                  hasQuery={debouncedQuery}
                  onClear={() => {
                    if (debouncedQuery) setQuery("");
                    else clearFilters();
                  }}
                />
              )}
            </div>



            {!useVirtual && limit < filtered.length ? (
              <div className="flex shrink-0 justify-center pt-2">
                <button
                  type="button"
                  data-nav-row={4}
                  tabIndex={0}
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="vexia-focus flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-8 py-3 text-sm font-bold text-vexia-text backdrop-blur-xl transition-all hover:border-vexia-purple/60 hover:shadow-[0_0_24px_rgb(var(--vexia-primary-rgb)/0.5)]"
                >
                  Mais {noun} disponíveis <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}

          </section>
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 md:px-8">
          <PlaylistErrorState />
          <EmptyPlaylist
            section={kind === "series" ? "As séries" : "Os filmes"}
            onOpenLists={() => setListsOpen(true)}
          />
        </div>
      )}

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
    </>
  );
}
