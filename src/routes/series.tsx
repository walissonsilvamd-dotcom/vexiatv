import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { Chips } from "../components/vexia/Chips";
import { LoadMore, PosterGrid, SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { allSeries, seriesCategories, seriesProgress } from "../data/vexia-catalog";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Séries" },
      {
        name: "description",
        content: "Catálogo de séries do VÉXIA TV com progresso de exibição e favoritos.",
      },
      { property: "og:title", content: "VÉXIA TV — Séries" },
      { property: "og:description", content: "Catálogo de séries do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [category, setCategory] = useState<string>("Todos");

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader />
      <div className="space-y-4 px-5 md:px-10">
        <SectionTitle>SÉRIES</SectionTitle>
        <Chips options={seriesCategories} value={category} onChange={setCategory} navRow={1} />
        <PosterGrid items={allSeries} navRow={2} progressMap={seriesProgress} />
        <LoadMore label="CARREGAR MAIS SÉRIES" navRow={3} />
      </div>
      <BottomTabs active="Séries" />
    </main>
  );
}
