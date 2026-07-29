import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, ListVideo, Play, Star } from "lucide-react";
import { useRef, useState } from "react";
import { PosterCard, SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { allMedia, findMedia } from "../data/vexia-catalog";

export const Route = createFileRoute("/detalhes/$id")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Detalhes" },
      {
        name: "description",
        content: "Sinopse, elenco, nota e recomendações do título selecionado no VÉXIA TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Detalhes do título" },
      { property: "og:description", content: "Sinopse, elenco e recomendações no VÉXIA TV." },
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

  const item = findMedia(id);
  if (!item) {
    return (
      <main className="grid min-h-screen place-items-center bg-vexia-bg text-vexia-text">
        <div className="text-center">
          <p className="text-lg font-bold">Título não encontrado</p>
          <Link to="/home" className="mt-4 inline-block text-xs text-vexia-cyan">
            Voltar para a Home
          </Link>
        </div>
      </main>
    );
  }

  const cast = item.cast ?? ["Ana Duarte", "Marco Reis", "Lia Fontes", "Bruno Antunes"];
  const recommendations = allMedia.filter((m) => m.id !== item.id).slice(0, 10);

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-16 text-vexia-text">
      <section className="relative h-[58vh] min-h-[340px] w-full overflow-hidden">
        <img src={item.backdrop} alt={item.title} className="h-full w-full object-cover" />
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
            <span className="flex items-center gap-1 text-vexia-gold">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {item.rating.toFixed(1)}
            </span>
            <span className="text-vexia-purple-soft">{item.year}</span>
            <span className="text-vexia-purple-soft">{item.genres.join(" • ")}</span>
            <span className="text-vexia-cyan">
              {item.runtime ?? `${item.seasons ?? 1} temporadas`}
            </span>
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
          <SectionTitle>SINOPSE</SectionTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-vexia-text">{item.overview}</p>
        </section>

        <section className="space-y-3">
          <SectionTitle>ELENCO</SectionTitle>
          <div className="no-scrollbar flex gap-5 overflow-x-auto pb-1">
            {cast.map((name) => (
              <div key={name} className="w-20 shrink-0 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-vexia-purple bg-vexia-card text-sm font-bold text-vexia-purple-soft">
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <p className="mt-2 text-[11px] text-vexia-text">{name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-1">
          <SectionTitle>ADICIONADO EM</SectionTitle>
          <p className="text-sm text-vexia-cyan">12/07/2026</p>
        </section>

        <section className="space-y-3">
          <SectionTitle>RECOMENDAÇÕES</SectionTitle>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {recommendations.map((rec) => (
              <div key={rec.id} className="w-[120px] shrink-0 md:w-[140px]">
                <PosterCard item={rec} navRow={4} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
