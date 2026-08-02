import { createFileRoute } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { CatalogScreen } from "../components/vexia/CatalogScreen";
import { usePlaylist } from "../lib/playlist-store";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Séries` },
      {
        name: "description",
        content: `Séries e temporadas da sua lista M3U organizadas no ${BRAND.name}.`,
      },
      { property: "og:title", content: `${BRAND.name} — Séries` },
      { property: "og:description", content: `Catálogo de séries do ${BRAND.name}.` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/series" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/series" }],
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
