import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, ImageOff, ListVideo, Play, Star } from "lucide-react";
import { useRef, useState } from "react";
import { PosterCard, SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";

export const Route = createFileRoute("/detalhes/$id")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Detalhes" },
      {
        name: "description",
        content: "Informações do título selecionado da sua lista M3U no VÉXIA TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Detalhes do título" },
      { property: "og:description", content: "Detalhes e recomendações no VÉXIA TV." },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetailsPage,
});

function DetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [fav, setFav] = useState(false);
  const { movies, series } = usePlaylist();

  const item = movies.find((m) => m.id === id) ?? series.find((s) => s.id === id);

  if (!item) {
    return (
      <main className="grid min-h-screen place-items-center bg-vexia-bg text-vexia-text">
        <div className="text-center">
          <p className="text-lg font-bold">Título não encontrado na lista carregada</p>
          <Link to="/home" className="mt-4 inline-block text-xs text-vexia-cyan">
            Voltar para a Home
          </Link>
        </div>
      </main>
    );
  }

  const pool = [...movies, ...series];
  const recommendations = pool
    .filter((m) => m.id !== item.id && m.genres[0] === item.genres[0])
    .slice(0, 12);

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-16 text-vexia-text">
      <section className="relative h-[58vh] min-h-[340px] w-full overflow-hidden">
        {item.backdrop ? (
          <img src={item.backdrop} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-vexia-purple/40 to-black">
            <ImageOff className="h-10 w-10 text-vexia-cyan/60" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-vexia-bg via-vexia-bg/60 to-black/60" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 md:px-10">
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => navigate({ to: "/home" })}
            className="vexia-focus grid h-10 w-10 place-items-center rounded-full bg-black/60"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
          </button>
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => setFav((f) => !f)}
            className="vexia-focus grid h-10 w-10 place-items-center rounded-full bg-black/60"
            aria-label="Favoritar"
          >
            <Heart
              className={`h-5 w-5 ${fav ? "fill-current text-vexia-purple-soft" : "text-vexia-cyan"}`}
              aria-hidden
            />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 md:px-10">
          <h1 className="text-2xl font-black md:text-4xl">{item.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
            {item.rating > 0 ? (
              <span className="flex items-center gap-1 text-vexia-gold">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                {item.rating.toFixed(1)}
              </span>
            ) : null}
            {item.year ? <span className="text-vexia-purple-soft">{item.year}</span> : null}
            <span className="text-vexia-purple-soft">{item.genres.join(" • ")}</span>
            {item.seasons ? (
              <span className="text-vexia-cyan">
                {item.seasons} temporadas • {item.episodes} episódios
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              data-nav-row={1}
              tabIndex={0}
              className="vexia-focus inline-flex items-center gap-2 rounded-full bg-vexia-purple px-8 py-2.5 text-xs font-bold tracking-wide"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden /> ASSISTIR
            </button>
            {item.seasons ? (
              <Link
                to="/serie/$id"
                params={{ id: item.id }}
                data-nav-row={1}
                tabIndex={0}
                className="vexia-focus inline-flex items-center gap-2 rounded-full border border-vexia-cyan/50 px-6 py-2.5 text-xs font-bold tracking-wide text-vexia-cyan"
              >
                <ListVideo className="h-4 w-4" aria-hidden /> EPISÓDIOS
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="space-y-8 px-5 pt-8 md:px-10">
        <section className="space-y-2">
          <SectionTitle>SOBRE</SectionTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-vexia-muted">
            {item.overview || "Sem sinopse na lista M3U para este título."}
          </p>
        </section>

        {recommendations.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle>RELACIONADOS</SectionTitle>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="w-[120px] shrink-0 md:w-[140px]">
                  <PosterCard item={rec} navRow={4} kind={rec.seasons ? "series" : "movie"} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
