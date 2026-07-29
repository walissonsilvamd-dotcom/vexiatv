import { createFileRoute } from "@tanstack/react-router";
import { CatalogScreen } from "../components/vexia/CatalogScreen";
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

function SeriesPage() {
  const { series, data } = usePlaylist();
  return (
    <CatalogScreen
      kind="series"
      activeTab="Séries"
      items={series}
      categories={data?.seriesCategories ?? ["Todos"]}
    />
  );
}
