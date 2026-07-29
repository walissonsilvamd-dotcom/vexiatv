import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useRef } from "react";
import { LoadMore } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { findMedia, seasonsFor } from "../data/vexia-catalog";

export const Route = createFileRoute("/serie/$id")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Episódios" },
      {
        name: "description",
        content: "Episódios organizados por temporada com sinopse, duração e nota no VÉXIA TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Episódios" },
      { property: "og:description", content: "Temporadas e episódios da série no VÉXIA TV." },
      { property: "og:type", content: "video.tv_show" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EpisodesPage,
});

function EpisodesPage() {
  const { id } = Route.useParams();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const serie = findMedia(id);

  if (!serie) {
    return (
      <main className="grid min-h-screen place-items-center bg-vexia-bg text-vexia-text">
        <Link to="/series" className="text-xs text-vexia-cyan">
          Série não encontrada — voltar
        </Link>
      </main>
    );
  }

  const seasons = seasonsFor(serie);

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-16 text-vexia-text">
      <div className="flex items-center gap-3 px-5 py-4 md:px-10">
        <Link
          to="/detalhes/$id"
          params={{ id: serie.id }}
          data-nav-row={0}
          tabIndex={0}
          className="vexia-focus grid h-10 w-10 place-items-center rounded-full bg-vexia-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-wide text-vexia-purple-soft md:text-2xl">
            {serie.title}
          </h1>
          <p className="text-xs text-vexia-cyan">
            {seasons.length} temporadas • {seasons.length * 6} episódios
          </p>
        </div>
      </div>

      <div className="space-y-8 px-5 md:px-10">
        {seasons.map((season, si) => (
          <section key={season.number} className="space-y-3">
            <h2 className="text-sm font-black tracking-wide text-vexia-purple-soft">
              SEASON {season.number}
            </h2>
            <ul className="space-y-2">
              {season.episodes.map((ep) => (
                <li key={ep.id}>
                  <button
                    type="button"
                    data-nav-row={si + 1}
                    tabIndex={0}
                    className="vexia-focus flex w-full gap-3 rounded-lg bg-vexia-card p-3 text-left"
                  >
                    <img
                      src={ep.thumb}
                      alt={ep.title}
                      loading="lazy"
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-black text-vexia-purple-soft">
                          {String(ep.number).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm font-medium text-vexia-text">
                          {ep.title}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] text-vexia-muted">
                        {ep.overview}
                      </span>
                      <span className="mt-1 flex items-center gap-3 text-[11px]">
                        <span className="text-vexia-cyan">{ep.runtime}</span>
                        <span className="flex items-center gap-1 text-vexia-gold">
                          <Star className="h-3 w-3 fill-current" aria-hidden />
                          {ep.rating.toFixed(1)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <LoadMore label="CARREGAR MAIS EPISÓDIOS" navRow={20} />
      </div>
    </main>
  );
}
