import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { Chips } from "../components/vexia/Chips";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { LoadMore, PosterGrid, SectionTitle } from "../components/vexia/PosterGrid";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Séries" },
      {
        name: "description",
        content: "Séries e temporadas da sua lista M3U organizadas no VÉXIA TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Séries" },
      { property: "og:description", content: "Catálogo de séries do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesPage,
});

const PAGE = 40;

function SeriesPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { series, data, hasContent } = usePlaylist();
  const [category, setCategory] = useState<string>("Todos");
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);

  const filtered = useMemo(
    () => (category === "Todos" ? series : series.filter((s) => s.genres[0] === category)),
    [series, category],
  );

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader />
      <div className="space-y-4 px-5 md:px-10">
        <SectionTitle>SÉRIES</SectionTitle>
        {hasContent && series.length > 0 ? (
          <>
            <Chips
              options={data?.seriesCategories ?? ["Todos"]}
              value={category}
              onChange={(c) => {
                setCategory(c);
                setLimit(PAGE);
              }}
              navRow={1}
            />
            <PosterGrid items={filtered.slice(0, limit)} navRow={2} kind="series" />
            {limit < filtered.length ? (
              <LoadMore
                label="CARREGAR MAIS SÉRIES"
                navRow={3}
                onClick={() => setLimit((l) => l + PAGE)}
              />
            ) : null}
          </>
        ) : (
          <EmptyPlaylist section="As séries" onOpenLists={() => setListsOpen(true)} />
        )}
      </div>
      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
      <BottomTabs active="Séries" />
    </main>
  );
}
