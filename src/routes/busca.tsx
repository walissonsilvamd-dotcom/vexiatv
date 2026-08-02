import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { Film, Search, Tv2, Clapperboard } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { PosterCard } from "../components/vexia/PosterGrid";
import { SmartImage } from "../components/vexia/SmartImage";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { useDebounce } from "../hooks/useDebounce";
import { usePlaylist } from "../lib/playlist-store";
import { setStreamHandoff } from "../lib/stream-handoff";
import { buildSearchIndex, queryIndex } from "../utils/search-index";
import { BRAND } from "../lib/brand";

export const Route = createFileRoute("/busca")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Busca global` },
      {
        name: "description",
        content:
          `Procure de uma só vez em filmes, séries e canais ao vivo da sua lista no ${BRAND.name}.`,
      },
      { property: "og:title", content: `${BRAND.name} — Busca global` },
      {
        property: "og:description",
        content: "Um só campo para encontrar filmes, séries e canais da sua lista.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/busca" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/busca" }],
  }),
  component: SearchPage,
});

const LIMIT = 18;

function SearchPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const navigate = useNavigate();
  const { movies, series, channels, hasContent } = usePlaylist();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 220);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const movieIndex = useMemo(
    () =>
      buildSearchIndex(movies, {
        id: (m) => m.id,
        name: (m) => m.title,
        category: (m) => m.category ?? "",
        genre: (m) => m.genres.join(" "),
        year: (m) => m.year,
      }),
    [movies],
  );
  const seriesIndex = useMemo(
    () =>
      buildSearchIndex(series, {
        id: (s) => s.id,
        name: (s) => s.title,
        category: (s) => s.category ?? "",
        genre: (s) => s.genres.join(" "),
        year: (s) => s.year,
      }),
    [series],
  );
  const channelIndex = useMemo(
    () =>
      buildSearchIndex(channels, {
        id: (c) => c.id,
        name: (c) => c.name,
        category: (c) => c.category,
        genre: (c) => c.group,
      }),
    [channels],
  );

  const term = debounced.trim();
  const results = useMemo(() => {
    if (term.length < 2) return null;
    return {
      movies: queryIndex(movieIndex, term, LIMIT),
      series: queryIndex(seriesIndex, term, LIMIT),
      channels: queryIndex(channelIndex, term, LIMIT),
    };
  }, [term, movieIndex, seriesIndex, channelIndex]);

  const total = results
    ? results.movies.length + results.series.length + results.channels.length
    : 0;

  return (
    <div ref={scopeRef} className="min-h-screen bg-vexia-bg text-vexia-text">
      <div
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(5,5,5,.92),rgba(5,5,5,.97)), url(${nebula.url})` }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link to="/home" className="vexia-focus rounded-lg" aria-label=`${BRAND.name} — início`>
            <VexiaLogo className="h-12 md:h-14" />
          </Link>
          <TopNav />
        </header>

        <main className="space-y-8 px-5 pb-20 md:px-10">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.85)]">
              Busca global
            </h1>
            <p className="text-xs font-medium uppercase tracking-widest text-vexia-cyan/80">
              Filmes, séries e canais ao mesmo tempo
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-vexia-purple/40 bg-black/60 px-5 py-4 backdrop-blur-xl focus-within:border-vexia-cyan/70">
            <Search className="h-5 w-5 text-vexia-cyan" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-nav-row={1}
              tabIndex={0}
              placeholder="Digite o nome do filme, série ou canal…"
              aria-label="Buscar em toda a lista"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-vexia-text/40"
            />
          </label>

          {!hasContent ? (
            <EmptyPlaylist section="Os resultados" />
          ) : term.length < 2 ? (
            <p className="text-sm text-vexia-text/60">
              Escreva pelo menos 2 letras para procurar em toda a sua lista.
            </p>
          ) : total === 0 ? (
            <p className="text-sm text-vexia-text/70">
              Nada encontrado para “{term}”. Tente outro termo ou parte do nome.
            </p>
          ) : (
            <div className="space-y-10">
              <Section
                title="Filmes"
                icon={<Film className="h-4 w-4" aria-hidden />}
                count={results!.movies.length}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
                  {results!.movies.map((item) => (
                    <PosterCard key={item.id} item={item} navRow={2} kind="movie" />
                  ))}
                </div>
              </Section>

              <Section
                title="Séries"
                icon={<Clapperboard className="h-4 w-4" aria-hidden />}
                count={results!.series.length}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">
                  {results!.series.map((item) => (
                    <PosterCard key={item.id} item={item} navRow={3} kind="series" />
                  ))}
                </div>
              </Section>

              <Section
                title="Canais ao vivo"
                icon={<Tv2 className="h-4 w-4" aria-hidden />}
                count={results!.channels.length}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {results!.channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      data-nav-row={4}
                      tabIndex={0}
                      onClick={() => {
                        setStreamHandoff("live", ch.id, ch.url);
                        void navigate({ to: "/player", search: { type: "live", id: ch.id } });
                      }}
                      className="vexia-focus flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 p-3 text-left transition-transform hover:scale-[1.03] hover:border-vexia-purple/60"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-vexia-card">
                        {ch.logo ? (
                          <SmartImage src={ch.logo} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-xs font-black text-vexia-cyan">{ch.initials}</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{ch.name}</span>
                        <span className="block truncate text-[11px] uppercase tracking-wider text-vexia-text/55">
                          {ch.category}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-vexia-cyan">
        {icon}
        {title}
        <span className="rounded-full bg-vexia-purple/30 px-2 py-0.5 text-[11px] text-white">{count}</span>
      </h2>
      {children}
    </section>
  );
}
