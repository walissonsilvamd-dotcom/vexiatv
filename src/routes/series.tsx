import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/vexia/PageShell";
import { MediaRow } from "../components/vexia/MediaRow";
import { featuredSeries, recentSeries } from "../data/vexia";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Séries" },
      { name: "description", content: "Catálogo de séries do VÉXIA TV (protótipo visual)." },
      { property: "og:title", content: "VÉXIA TV — Séries" },
      { property: "og:description", content: "Catálogo de séries do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  return (
    <PageShell title="SÉRIES" subtitle="Temporadas e episódios serão listados a partir da playlist.">
      <MediaRow title="EM DESTAQUE" items={featuredSeries} navRow={1} />
      <MediaRow title="ADICIONADAS RECENTEMENTE" items={recentSeries} navRow={2} />
    </PageShell>
  );
}
