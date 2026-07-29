import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { Chips } from "../components/vexia/Chips";
import { LoadMore, PosterCard, PosterGrid, SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { featured } from "../data/vexia";
import { allMovies, continueWatching, movieCategories, SLOGAN } from "../data/vexia-catalog";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Home" },
      {
        name: "description",
        content:
          "Home do VÉXIA TV: destaque em tela cheia, retomar assistir, filmes e séries por categoria.",
      },
      { property: "og:title", content: "VÉXIA TV — Home" },
      { property: "og:description", content: "Home do VÉXIA TV para Android TV e Smart TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState<string>("Todos");

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % featured.length), 7000);
    return () => clearInterval(id);
  }, []);

  const hero = featured[index];

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <section className="relative h-[62vh] min-h-[360px] w-full overflow-hidden">
        {featured.map((item, i) => (
          <img
            key={item.id}
            src={item.backdrop}
            alt={item.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-vexia-bg via-vexia-bg/60 to-black/50" />

        <div className="relative z-10">
          <AppHeader />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-8 md:px-10">
          <h1 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">{hero.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-vexia-gold">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {hero.rating.toFixed(1)}
            </span>
            <span className="text-vexia-purple-soft">{hero.year}</span>
            <span className="text-vexia-purple-soft">{hero.genres.join(" • ")}</span>
            <span className="text-vexia-cyan">{hero.runtime}</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-vexia-muted">{hero.overview}</p>
          <Link
            to="/detalhes/$id"
            params={{ id: hero.id }}
            data-nav-row={1}
            tabIndex={0}
            className="vexia-focus mt-5 inline-flex items-center gap-2 rounded-full bg-vexia-purple px-7 py-2.5 text-xs font-bold tracking-wide"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden /> ASSISTIR
          </Link>
        </div>
      </section>

      <div className="space-y-8 px-5 pt-8 md:px-10">
        <section className="space-y-3">
          <SectionTitle>RETOMAR ASSISTIR</SectionTitle>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {continueWatching.map(({ item, progress }) => (
              <div key={item.id} className="w-[110px] shrink-0 md:w-[140px]">
                <PosterCard item={item} navRow={2} progress={progress} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>CATÁLOGO</SectionTitle>
          <Chips options={movieCategories} value={category} onChange={setCategory} navRow={3} />
          <PosterGrid items={allMovies.slice(0, 12)} navRow={4} />
          <LoadMore label="CARREGAR MAIS" navRow={5} />
        </section>

        <p className="pb-4 text-center text-[10px] tracking-[0.3em] text-vexia-cyan/70">{SLOGAN}</p>
      </div>

      <BottomTabs active="Home" />
    </main>
  );
}
