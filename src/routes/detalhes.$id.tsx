import { matchesLegacyId } from "../utils/hash";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Heart,
  ImageOff,
  ListVideo,
  Play,
  Star,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { PosterCard } from "../components/vexia/PosterGrid";
import { TopNav } from "../components/vexia/TopNav";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import type { PlaylistEpisode, PlaylistSeries } from "../lib/m3u";
import { usePlaylist } from "../lib/playlist-store";
import { mediaFavorite, useFavorites } from "../lib/favorites-store";
import { isWatched, useProgress } from "../lib/progress-store";
import { useTmdbItem } from "../lib/use-tmdb";
import { SmartImage } from "../components/vexia/SmartImage";

import { useSeriesEpisodes } from "../hooks/useSeriesEpisodes";

export const Route = createFileRoute("/detalhes/$id")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Detalhes do título" },
      {
        name: "description",
        content:
          "Ficha completa do título da sua lista M3U no VÉXIA TV: sinopse, elenco, temporadas e recomendações.",
      },
      { property: "og:title", content: "VÉXIA TV — Detalhes do título" },
      {
        property: "og:description",
        content: "Sinopse, elenco, temporadas e recomendações no VÉXIA TV.",
      },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetailsPage,
});

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-sm font-black tracking-[0.14em] text-vexia-text">{children}</h2>
      <span className="block h-0.5 w-16 rounded-full bg-vexia-purple shadow-[0_0_12px_rgba(123,47,190,0.8)]" />
    </div>
  );
}

function DetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { has, toggle } = useFavorites();
  const { movies, series, source } = usePlaylist();

  const raw =
    movies.find((m) => m.id === id) ??
    series.find((s) => s.id === id) ??
    movies.find((m) => matchesLegacyId(id, m.title)) ??
    series.find((s) => matchesLegacyId(id, s.title));
  const isSeries = !!raw && "episodesList" in raw;
  const { episodes: epList } = useSeriesEpisodes(isSeries ? (raw as PlaylistSeries) : null);
  const fav = has(isSeries ? "series" : "movie", raw?.title ?? "");
  const kind: "movie" | "series" = isSeries ? "series" : "movie";
  const { data: enriched } = useTmdbItem(raw ?? null, kind);
  const item = enriched ?? raw;
  const { entryFor, resume } = useProgress(item?.id);

  const seasons = useMemo(() => {
    const list = epList;
    if (!list.length) return [];
    const map = new Map<number, PlaylistEpisode[]>();
    for (const ep of list) {
      const arr = map.get(ep.season) ?? [];
      arr.push(ep);
      map.set(ep.season, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([number, episodes]) => ({ number, episodes }));
  }, [epList]);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const activeSeason = seasons.find((s) => s.number === selectedSeason) ?? null;


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
    .filter((m) => m.id !== item.id && m.genres.some((g) => item.genres.includes(g)))
    .slice(0, 14);

  const addedAt = source?.loadedAt ? new Date(source.loadedAt) : null;
  const cast = item.castList ?? item.cast?.map((name) => ({ name, photo: "", character: "" }));

  return (
    <main ref={scopeRef} className="vexia-safe min-h-screen bg-vexia-bg pb-16 text-vexia-text">
      <div className="px-5 pt-4 md:px-10">
        <TopNav active={isSeries ? "Séries" : "Filmes"} className="w-fit" />
      </div>

      {/* ─── Destaque com backdrop ─── */}
      <section className="relative mt-3 min-h-[360px] w-full overflow-hidden md:h-[60vh]">
        {item.backdrop ? (
          <SmartImage
            src={item.backdrop}
            role="backdrop"
            alt={item.title}
            eager
            sizes="100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-vexia-purple/40 to-black">
            <ImageOff className="h-10 w-10 text-vexia-cyan/60" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-vexia-bg via-vexia-bg/70 to-black/70" />

        <div className="relative flex items-start justify-between px-5 py-4 md:px-10">
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => navigate({ to: isSeries ? "/series" : "/filmes" })}
            className="vexia-focus grid h-10 w-10 place-items-center rounded-full bg-black/60"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
          </button>
          <button
            type="button"
            data-nav-row={0}
            tabIndex={0}
            onClick={() => item && toggle(mediaFavorite(item, isSeries ? "series" : "movie"))}
            className={`vexia-focus grid h-10 w-10 place-items-center rounded-full border bg-black/60 ${
              fav ? "border-vexia-purple" : "border-vexia-cyan/70"
            }`}
            aria-label="Favoritar"
            aria-pressed={fav}
          >
            <Heart
              className={`h-5 w-5 ${fav ? "fill-current text-vexia-purple-soft" : "text-vexia-cyan"}`}
              aria-hidden
            />
          </button>
        </div>

        <div className="relative flex flex-col gap-6 px-5 pb-8 pt-4 md:flex-row md:items-end md:px-10">
          {item.poster ? (
            <SmartImage
              src={item.poster}
              role="poster"
              alt={item.title}
              eager
              preview={false}
              sizes="180px"
              className="hidden w-[180px] shrink-0 rounded-2xl border border-vexia-purple/40 shadow-[0_18px_50px_-16px_rgba(123,47,190,0.8)] md:block"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight md:text-4xl">
              {item.title}
              {item.year ? ` (${item.year})` : ""}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold">
              {item.rating > 0 ? (
                <span className="flex items-center gap-1 text-vexia-gold">
                  <Star className="h-4 w-4 fill-current" aria-hidden />
                  {item.rating.toFixed(1)}
                </span>
              ) : null}
              {item.genres.length ? (
                <span className="text-vexia-purple-soft">{item.genres.join(" • ")}</span>
              ) : null}
              {item.runtime ? <span className="text-vexia-cyan">{item.runtime}</span> : null}
              {isSeries ? (
                <span className="text-vexia-cyan">
                  {seasons.length} temporadas • {epList.length || item.episodes || 0} episódios
                </span>
              ) : null}
            </div>

            {isSeries && seasons.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-black tracking-[0.14em] text-vexia-purple-soft">
                  ESCOLHA A TEMPORADA
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {seasons.map((season) => {
                    const active = season.number === selectedSeason;
                    return (
                      <button
                        key={season.number}
                        type="button"
                        data-nav-row={1}
                        tabIndex={0}
                        aria-pressed={active}
                        onClick={() => {
                          setSelectedSeason(season.number);
                          document
                            .getElementById("temporadas")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className={`vexia-focus inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold tracking-wide transition ${
                          active
                            ? "bg-vexia-purple text-vexia-text shadow-[0_0_24px_-6px_rgba(123,47,190,0.9)]"
                            : "border border-vexia-purple/50 bg-black/50 text-vexia-purple-soft"
                        }`}
                      >
                        <ListVideo className="h-4 w-4" aria-hidden /> TEMPORADA{" "}
                        {String(season.number).padStart(2, "0")}
                        <span className="text-[10px] font-semibold text-vexia-cyan">
                          {season.episodes.length} ep
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      to: "/player",
                      search: {
                        type: isSeries ? "series" : "movie",
                        id: item.id,
                        ep: isSeries ? resume?.key.split("::")[1] : undefined,
                      },
                    })
                  }
                  className="vexia-focus inline-flex items-center gap-2 rounded-full bg-vexia-purple px-8 py-2.5 text-xs font-bold tracking-wide text-vexia-text shadow-[0_0_24px_-6px_rgba(123,47,190,0.9)]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden /> ASSISTIR
                </button>
              </div>
            )}

          </div>
        </div>
      </section>

      <div className="space-y-9 px-5 pt-8 md:px-10">
        {/* ─── Sinopse ─── */}
        <section className="space-y-3">
          <SectionHeading>SINOPSE</SectionHeading>
          <p className="max-w-4xl text-sm leading-relaxed text-vexia-text">
            {item.overview || "Sem sinopse disponível para este título."}
          </p>
        </section>

        {/* ─── Elenco ─── */}
        {cast && cast.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading>ELENCO</SectionHeading>
            <div className="no-scrollbar vexia-fade-edges vexia-smooth-scroll flex gap-4 overflow-x-auto pb-2">
              {cast.map((person) => (
                <div key={person.name} className="w-[76px] shrink-0 text-center">
                  {person.photo ? (
                    <SmartImage
                      src={person.photo}
                      role="logo"
                      alt={person.name}
                      preview={false}
                      sizes="64px"
                      className="mx-auto h-16 w-16 rounded-full border-2 border-vexia-purple object-cover"
                    />
                  ) : (
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-vexia-purple bg-vexia-card text-sm font-black text-vexia-cyan">
                      {person.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <p className="mt-1.5 truncate text-[11px] font-medium text-vexia-text">
                    {person.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ─── Continuar assistindo ─── */}
        {resume ? (
          <section className="space-y-3">
            <SectionHeading>CONTINUAR ASSISTINDO</SectionHeading>
            <div className="max-w-2xl space-y-3 rounded-2xl border border-vexia-purple/30 bg-vexia-card/70 p-4">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="truncate text-vexia-text">{resume.label ?? item.title}</span>
                <span className="text-vexia-cyan">{Math.round(resume.percent)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-vexia-purple shadow-[0_0_12px_rgba(123,47,190,0.9)]"
                  style={{ width: `${resume.percent}%` }}
                />
              </div>
              <button
                type="button"
                data-nav-row={2}
                tabIndex={0}
                onClick={() =>
                  navigate({
                    to: "/player",
                    search: {
                      type: isSeries ? "series" : "movie",
                      id: item.id,
                      ep: isSeries ? resume.key.split("::")[1] : undefined,
                    },
                  })
                }
                className="vexia-focus inline-flex items-center gap-2 rounded-full bg-vexia-purple px-6 py-2 text-xs font-bold tracking-wide text-vexia-text"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden /> CONTINUAR
              </button>
            </div>
          </section>
        ) : null}

        {/* ─── Temporadas e episódios ─── */}
        {isSeries && activeSeason ? (
          <section id="temporadas" className="space-y-4">
            <SectionHeading>
              TEMPORADA {String(activeSeason.number).padStart(2, "0")}
            </SectionHeading>
            {[activeSeason].map((season, si) => (
              <div key={season.number} className="space-y-2">

                <ul className="space-y-2">
                  {season.episodes.map((ep) => {
                    const entry = entryFor(`${item.id}::${ep.id}`);
                    const watched = isWatched(entry);
                    return (
                      <li key={ep.id}>
                        <button
                          type="button"
                          data-nav-row={3 + si}
                          tabIndex={0}
                          onClick={() =>
                            navigate({
                              to: "/player",
                              search: { type: "series", id: item.id, ep: ep.id },
                            })
                          }
                          className="vexia-focus flex w-full items-center gap-3 rounded-xl border border-white/5 bg-vexia-card/70 p-3 text-left"
                        >
                          {watched ? (
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-vexia-purple-soft"
                              aria-hidden
                            />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-vexia-muted" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-vexia-text">
                              Episódio {String(ep.number).padStart(2, "0")} • {ep.title}
                            </span>
                            {entry && !watched ? (
                              <span className="mt-1.5 block h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
                                <span
                                  className="block h-full rounded-full bg-vexia-purple"
                                  style={{ width: `${entry.percent}%` }}
                                />
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-vexia-cyan">
                            {entry?.durationSec
                              ? `${Math.round(entry.durationSec / 60)} min`
                              : "▶"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {/* ─── Recomendações ─── */}
        {recommendations.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading>RECOMENDAÇÕES</SectionHeading>
            <div className="no-scrollbar vexia-fade-edges vexia-smooth-scroll flex gap-3 overflow-x-auto pb-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="w-[120px] shrink-0 md:w-[140px]">
                  <PosterCard
                    item={rec}
                    navRow={20}
                    kind={"episodesList" in rec ? "series" : "movie"}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {addedAt ? (
          <p className="text-xs font-medium text-vexia-cyan">
            Data Adicionada: {addedAt.toLocaleDateString("pt-BR")}
          </p>
        ) : null}
      </div>
    </main>
  );
}
