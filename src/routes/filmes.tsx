import { createFileRoute } from "@tanstack/react-router";
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
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
