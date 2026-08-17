import { createFileRoute } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { CatalogScreen } from "../components/vexia/CatalogScreen";
import { usePlaylist } from "../lib/playlist-store";
import { BRAND } from "../lib/brand";

export const Route = createFileRoute("/filmes")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || "",
  }),
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Filmes` },
      { name: "description", content: `Catálogo de filmes da sua lista M3U no ${BRAND.name}.` },
      { property: "og:title", content: `${BRAND.name} — Filmes` },
      { property: "og:description", content: `Catálogo de filmes do ${BRAND.name}.` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/filmes" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
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
