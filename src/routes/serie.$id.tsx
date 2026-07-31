import { setStreamHandoff } from "../lib/stream-handoff";
import { warmEngines } from "../hooks/player-engines";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";
import { PosterArt } from "../components/vexia/PosterArt";
import { AudioTagBadge } from "../components/vexia/AudioTagBadge";
import { countriesLabel } from "../lib/country";

import { useMemo, useRef } from "react";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";
import { useTmdbItem } from "../lib/use-tmdb";
import { useTmdbSeason } from "../lib/use-tmdb-season";
import type { PlaylistEpisode } from "../lib/m3u";

import { TopNav } from "../components/vexia/TopNav";

import { useSeriesEpisodes } from "../hooks/useSeriesEpisodes";
import { SmartImage } from "../components/vexia/SmartImage";

export const Route = createFileRoute("/serie/$id")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Episódios" },
      {
        name: "description",
        content: "Temporadas e episódios da série carregada da sua lista M3U no VÉXIA TV.",
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
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { series } = usePlaylist();
  const raw = series.find((s) => s.id === id);
  const { data: enriched } = useTmdbItem(raw ?? null, "series");
  const serie = enriched ?? raw;
  const { episodes: epList, loading: epLoading } = useSeriesEpisodes(raw);

  const seasons = useMemo(() => {
    if (!serie) return [];
    const map = new Map<number, typeof epList>();
    for (const ep of epList) {
      const arr = map.get(ep.season) ?? [];
      arr.push(ep);
      map.set(ep.season, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([number, episodes]) => ({ number, episodes }));
  }, [serie, epList]);

  if (!serie) {
    return (
      <main className="grid min-h-screen place-items-center bg-vexia-bg text-vexia-text">
        <Link to="/series" className="text-xs text-vexia-cyan">
          Série não encontrada na lista — voltar
        </Link>
      </main>
    );
  }

  return (
    <main ref={scopeRef} className="vexia-safe min-h-screen bg-vexia-bg pb-10 text-vexia-text">
      <div className="px-5 pt-4 md:px-10">
        <TopNav active="Séries" className="w-fit" />
      </div>
      <div className="flex items-center gap-3 px-5 py-3 md:px-10">
        <Link
          to="/series"
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
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold">
            <AudioTagBadge
              sources={[raw?.title, serie.title, serie.category, (raw as { group?: string })?.group]}
            />
            {serie.rating > 0 ? (
              <span className="rounded-md bg-black/45 px-2 py-0.5 text-vexia-gold">
                ★ {serie.rating.toFixed(1)}
              </span>
            ) : null}
            {countriesLabel(serie.countries) ? (
              <span className="rounded-md bg-black/45 px-2 py-0.5 text-vexia-text">
                {countriesLabel(serie.countries)}
              </span>
            ) : null}
            {serie.genres.length ? (
              <span className="rounded-md bg-black/45 px-2 py-0.5 text-vexia-purple-soft">
                {serie.genres.slice(0, 3).join(" • ")}
              </span>
            ) : null}
            <span className="rounded-md bg-black/45 px-2 py-0.5 text-vexia-cyan">
              {epLoading ? "Carregando episódios…" : `${seasons.length} temp • ${epList.length} ep`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 md:px-10">
        {seasons.map((season, si) => (
          <SeasonEpisodes
            key={season.number}
            season={season.number}
            episodes={season.episodes}
            seriesId={id}
            seriesTitle={serie.title}
            audioFallback={[raw?.title, serie.category, (raw as { group?: string })?.group]}
            seriesYear={serie.year}
            navRow={si + 1}
            onPlay={(ep) => {
              setStreamHandoff("series", id, ep.url, ep.id);
              void navigate({ to: "/player", search: { type: "series", id, ep: ep.id } });
            }}
          />
        ))}
      </div>
    </main>
  );
}

/**
 * Uma temporada com a IMAGEM de cada capítulo.
 *
 * A miniatura vem da lista quando existe; quando não vem (é o caso mais comum
 * nas listas IPTV), buscamos o still oficial do episódio no TMDB — junto com a
 * sinopse e a duração, que ajudam a escolher o capítulo sem entrar nele.
 */
function SeasonEpisodes({
  season,
  episodes,
  seriesId,
  seriesTitle,
  seriesYear,
  audioFallback,
  navRow,
  onPlay,
}: {
  season: number;
  episodes: PlaylistEpisode[];
  seriesId: string;
  seriesTitle: string;
  seriesYear?: number;
  audioFallback?: (string | undefined | null)[];
  navRow: number;
  onPlay: (ep: PlaylistEpisode) => void;
}) {
  const { byNumber } = useTmdbSeason(seriesTitle, seriesYear, season);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-black tracking-wide text-vexia-purple-soft">
        TEMPORADA {season}
      </h2>
      <ul className="space-y-2">
        {episodes.map((ep) => {
          const meta = byNumber.get(ep.number);
          const image = ep.thumb || meta?.still;
          const title = ep.title || meta?.name || `Episódio ${ep.number}`;
          return (
            <li key={ep.id}>
              <button
                type="button"
                data-nav-row={navRow}
                tabIndex={0}
                onFocus={() => warmEngines(ep.url)}
                onMouseEnter={() => warmEngines(ep.url)}
                onClick={() => onPlay(ep)}
                className="vexia-focus flex w-full gap-3 rounded-lg bg-vexia-card p-3 text-left"
              >
                <span className="relative h-[4.5rem] w-32 shrink-0 overflow-hidden rounded-lg bg-black/60">
                  {image ? (
                    <SmartImage
                      src={image}
                      role="still"
                      alt={`Imagem do episódio ${ep.number}`}
                      sizes="128px"
                      className="h-full w-full object-cover"
                      fallback={<PosterArt title={title} kind="series" compact />}
                    />
                  ) : (
                    <PosterArt title={title} kind="series" compact />
                  )}
                  {meta?.runtimeMin ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-vexia-cyan">
                      {meta.runtimeMin}min
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <AudioTagBadge sources={[ep.title]} fallbackSources={audioFallback} />
                    <span className="block truncate text-sm font-bold text-vexia-text">
                      {String(ep.number).padStart(2, "0")} — {title}
                    </span>
                  </span>

                  <span className="mt-1 block truncate text-[11px] text-vexia-cyan">
                    Temporada {season} • Episódio {ep.number}
                    {meta?.rating ? ` • ★ ${meta.rating.toFixed(1)}` : ""}
                  </span>

                  {meta?.overview ? (
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-vexia-muted">
                      {meta.overview}
                    </span>
                  ) : null}
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full bg-vexia-purple">
                  <Play className="h-4 w-4 fill-current text-vexia-text" aria-hidden />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

