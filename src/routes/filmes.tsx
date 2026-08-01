import { createFileRoute } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { CatalogScreen } from "../components/vexia/CatalogScreen";
import { usePlaylist } from "../lib/playlist-store";

export const Route = createFileRoute("/filmes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Filmes" },
      { name: "description", content: "Catálogo de filmes da sua lista M3U no VÉXIA TV." },
      { property: "og:title", content: "VÉXIA TV — Filmes" },
      { property: "og:description", content: "Catálogo de filmes do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/filmes" },
      { property: "og:image", content: ogImage.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage.url },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/filmes" }],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { movies, data } = usePlaylist();
  return (
    <CatalogScreen
      kind="movie"
      activeTab="Filmes"
      items={movies}
      categories={data?.movieCategories ?? ["Todos"]}
    />
  );
}
