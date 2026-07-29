import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/vexia/PageShell";
import { MediaRow } from "../components/vexia/MediaRow";
import { featuredMovies, recentMovies } from "../data/vexia";

export const Route = createFileRoute("/filmes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Filmes" },
      { name: "description", content: "Catálogo de filmes do VÉXIA TV (protótipo visual)." },
      { property: "og:title", content: "VÉXIA TV — Filmes" },
      { property: "og:description", content: "Catálogo de filmes do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  return (
    <PageShell title="FILMES" subtitle="Layout preparado para metadados do TMDB.">
      <MediaRow title="EM DESTAQUE" items={featuredMovies} navRow={1} />
      <MediaRow title="ADICIONADOS RECENTEMENTE" items={recentMovies} navRow={2} />
    </PageShell>
  );
}
