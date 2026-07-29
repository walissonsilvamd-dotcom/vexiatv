import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { Chips } from "../components/vexia/Chips";
import { LoadMore, PosterGrid, SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { allMovies, movieCategories } from "../data/vexia-catalog";

export const Route = createFileRoute("/filmes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Filmes" },
      { name: "description", content: "Catálogo de filmes do VÉXIA TV com notas, ano e favoritos." },
      { property: "og:title", content: "VÉXIA TV — Filmes" },
      { property: "og:description", content: "Catálogo de filmes do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [category, setCategory] = useState<string>("Todos");

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader />
      <div className="space-y-4 px-5 md:px-10">
        <SectionTitle>FILMES</SectionTitle>
        <Chips options={movieCategories} value={category} onChange={setCategory} navRow={1} />
        <PosterGrid items={allMovies} navRow={2} />
        <LoadMore label="CARREGAR MAIS FILMES" navRow={3} />
      </div>
      <BottomTabs active="Filmes" />
    </main>
  );
}
