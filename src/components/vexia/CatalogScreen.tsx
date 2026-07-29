import { Link } from "@tanstack/react-router";
import { ChevronDown, Clock, Search, Undo2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import nebula from "../../assets/nebula-bg.jpg.asset.json";
import type { MediaItem } from "../../data/vexia";
import { useSpatialNav } from "../../hooks/use-spatial-nav";
import { EmptyPlaylist } from "./EmptyPlaylist";
import { PosterCard } from "./PosterGrid";
import { QrPlaylistDialog } from "./QrPlaylistDialog";
import { VexiaLogo } from "./VexiaLogo";

const TABS = [
  { label: "Home", to: "/home" as const },
  { label: "Canais", to: "/canais" as const },
  { label: "Filmes", to: "/filmes" as const },
  { label: "Séries", to: "/series" as const },
];

const PAGE = 24;

export function CatalogScreen({
  kind,
  items,
  categories,
  activeTab,
}: {
  kind: "movie" | "series";
  items: MediaItem[];
  categories: string[];
  activeTab: "Filmes" | "Séries";
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);

  const noun = kind === "series" ? "séries" : "filmes";

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.genres[0] ?? "Sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === "Todos" || item.genres[0] === category) &&
        (!q || item.title.toLowerCase().includes(q)),
    );
  }, [items, category, query]);

  const visible = filtered.slice(0, limit);
  const hasContent = items.length > 0;

  return (
    <main
      ref={scopeRef}
      className="relative min-h-screen bg-vexia-bg text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,5,0.82), rgba(5,5,5,0.92)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Barra superior */}
      <header className="flex items-center gap-4 px-6 py-4 md:px-10">
        <nav className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5 backdrop-blur-xl">
          {TABS.map((tab) => {
            const active = tab.label === activeTab;
            return (
              <Link
                key={tab.label}
                to={tab.to}
                data-nav-row={0}
                tabIndex={0}
                className={`vexia-focus rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                  active
                    ? "bg-gradient-to-b from-vexia-purple to-vexia-purple/70 text-white shadow-[0_0_20px_rgba(123,47,190,0.6)]"
                    : "text-vexia-text/85 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <label className="relative flex-1 max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
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
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2.5 pl-11 pr-4 text-sm text-vexia-text placeholder:text-vexia-text/45 backdrop-blur-xl outline-none"
          />
        </label>

        <div className="ml-auto">
          <VexiaLogo className="h-12" />
        </div>
      </header>

      {hasContent ? (
        <div className="grid gap-6 px-6 pb-12 md:px-10 lg:grid-cols-[300px_1fr]">
          {/* Coluna esquerda */}
          <aside className="h-fit rounded-3xl border border-white/10 bg-gradient-to-b from-[#141414]/90 to-[#0A0A0A]/90 p-4 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,1)]">
            <div className="grid place-items-center py-4">
              <VexiaLogo className="h-24" />
            </div>
            <div className="my-3 h-px bg-white/10" />
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

            <ul className="mt-2 max-h-[52vh] space-y-1 overflow-y-auto pr-1">
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
                          ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/60 font-bold text-white shadow-[0_0_18px_rgba(123,47,190,0.55)]"
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
          </aside>

          {/* Coluna direita */}
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgba(123,47,190,0.85)]">
                  {kind === "series" ? "Séries" : "Filmes"}
                </h1>
                <p className="text-xs font-medium uppercase tracking-widest text-vexia-cyan/80">
                  {items.length} {noun} na sua lista
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-vexia-text/85">
                Ordenar por Adicionados <ChevronDown className="h-4 w-4" aria-hidden />
              </span>
              <span className="flex items-center gap-2 text-sm font-medium text-vexia-text/85">
                {category} ({filtered.length})
                <span className="h-2 w-2 rounded-full bg-vexia-purple shadow-[0_0_10px_rgba(123,47,190,0.9)]" />
              </span>
            </div>

            {visible.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 md:grid-cols-4 xl:grid-cols-6">
                {visible.map((item) => (
                  <PosterCard key={item.id} item={item} navRow={3} kind={kind} />
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-vexia-text/60">
                Nenhum resultado para “{query}”.
              </p>
            )}

            {limit < filtered.length ? (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  data-nav-row={4}
                  tabIndex={0}
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="vexia-focus flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-8 py-3 text-sm font-bold text-vexia-text backdrop-blur-xl transition-all hover:border-vexia-purple/60 hover:shadow-[0_0_24px_rgba(123,47,190,0.5)]"
                >
                  Mais {noun} disponíveis <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        <div className="px-6 pb-16 md:px-10">
          <EmptyPlaylist
            section={kind === "series" ? "As séries" : "Os filmes"}
            onOpenLists={() => setListsOpen(true)}
          />
        </div>
      )}

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
  );
}
