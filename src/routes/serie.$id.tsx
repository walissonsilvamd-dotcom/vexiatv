import { setStreamHandoff } from "../lib/stream-handoff";
import { warmEngines } from "../hooks/player-engines";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Play } from "lucide-react";
import { PosterArt } from "../components/vexia/PosterArt";
import { useMemo, useRef } from "react";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";
import { useTmdbItem } from "../lib/use-tmdb";

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
    <main ref={scopeRef} className="vexia-safe min-h-screen bg-vexia-bg pb-16 text-vexia-text">
      <div className="px-5 pt-4 md:px-10">
        <TopNav active="Séries" className="w-fit" />
      </div>
      <div className="flex items-center gap-3 px-5 py-4 md:px-10">
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
          <p className="text-xs text-vexia-cyan">
            {epLoading ? "Carregando episódios…" : `${seasons.length} temporadas • ${epList.length} episódios`}
          </p>
        </div>
      </div>

      <div className="space-y-8 px-5 md:px-10">
        {seasons.map((season, si) => (
          <section key={season.number} className="space-y-3">
            <h2 className="text-sm font-black tracking-wide text-vexia-purple-soft">
              TEMPORADA {season.number}
            </h2>
            <ul className="space-y-2">
              {season.episodes.map((ep) => (
                <li key={ep.id}>
                  <button
                    type="button"
                    data-nav-row={si + 1}
                    tabIndex={0}
                    onFocus={() => warmEngines(ep.url)}
                    onMouseEnter={() => warmEngines(ep.url)}
                    onClick={() => {
                      setStreamHandoff("series", id, ep.url, ep.id);
                      void navigate({
                        to: "/player",
                        search: { type: "series", id, ep: ep.id },
                      });
                    }}
                    className="vexia-focus flex w-full gap-3 rounded-lg bg-vexia-card p-3 text-left"
                  >
                    {ep.thumb ? (
                      <SmartImage
                        src={ep.thumb}
                        role="still"
                        alt=""
                        preview={false}
                        sizes="112px"
                        className="h-16 w-28 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="h-16 w-28 shrink-0 overflow-hidden rounded-lg">
                        <PosterArt title={ep.title || `Episódio ${ep.number}`} kind="series" compact />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <AudioTagBadge sources={[ep.title]} />
                        <span className="block truncate text-sm font-bold text-vexia-text">
                          {String(ep.number).padStart(2, "0")} — {ep.title}
                        </span>
                      </span>

                      <span className="mt-1 block truncate text-[11px] text-vexia-cyan">
                        Temporada {season.number} • Episódio {ep.number}
                      </span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full bg-vexia-purple">
                      <Play className="h-4 w-4 fill-current text-vexia-text" aria-hidden />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
