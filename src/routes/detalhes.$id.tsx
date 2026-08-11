import { matchesLegacyId } from "../utils/hash";
import { setStreamHandoff } from "../lib/stream-handoff";
import { warmEngines } from "../hooks/player-engines";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Heart,
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
import { isWatched, useProgress, type ProgressEntry } from "../lib/progress-store";
import { useTmdbItem } from "../lib/use-tmdb";
import { useTmdbSeason } from "../lib/use-tmdb-season";
import { SmartImage } from "../components/vexia/SmartImage";
import { PosterArt } from "../components/vexia/PosterArt";
import { AudioTagBadge } from "../components/vexia/AudioTagBadge";
import { countriesLabel } from "../lib/country";
import { useDynamicSeo } from "../lib/dynamic-seo";


import { useMovieInfo } from "../hooks/useMovieInfo";
import { useSeriesEpisodes } from "../hooks/useSeriesEpisodes";
import { BRAND } from "../lib/brand";

export const Route = createFileRoute("/detalhes/$id")({
  head: ({ params }) => {
    const url = `https://vexiatv.lovable.app/detalhes/${params.id}`;
    return {
      meta: [
        { title: `${BRAND.name} — Detalhes do título` },
        {
          name: "description",
          content:
            `Ficha completa do título da sua lista M3U no ${BRAND.name}: sinopse, elenco, temporadas e recomendações.`,
        },
        { property: "og:title", content: `${BRAND.name} — Detalhes do título` },
        {
          property: "og:description",
          content: `Sinopse, elenco, temporadas e recomendações no ${BRAND.name}.`,
        },
        { property: "og:type", content: "video.movie" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: DetailsPage,
});

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="text-[13px] font-black tracking-[0.14em] text-vexia-text">{children}</h2>
      <span className="block h-0.5 w-16 rounded-full bg-vexia-purple shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.8)]" />
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
  /* Filmes: completa sinopse/nota/duração com os dados do painel (cache +
     prefetch por foco, então normalmente já está pronto ao abrir). */
  const vodInfo = useMovieInfo(!isSeries ? (raw ?? null) : null, !isSeries);
  const base = enriched ?? raw;
  const item = base
    ? {
        ...base,
        overview: base.overview || vodInfo?.plot || "",
        rating: base.rating > 0 ? base.rating : (vodInfo?.rating ?? 0),
        runtime: base.runtime || (vodInfo?.runtimeMin ? `${vodInfo.runtimeMin}min` : base.runtime),
      }
    : base;
  const { entryFor, resume } = useProgress(item?.id);
  /** Link do item a retomar (episódio salvo ou o filme) — acelera o play. */
  const resumeUrl = isSeries
    ? epList.find((e) => e.id === resume?.key.split("::")[1])?.url
    : (raw as { streamUrl?: string } | undefined)?.streamUrl;


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

  // SEO real da ficha: título/sinopse/imagem e schema Movie ou TVSeries.
  const seoTitle = item ? `${item.title}${item.year ? ` (${item.year})` : ""} — ${BRAND.name}` : undefined;
  const seoDesc = item
    ? (item.overview || `Assista ${item.title} no ${BRAND.name}: ficha, elenco e recomendações.`).slice(0, 158)
    : undefined;
  const seoJsonLd = useMemo(() => {
    if (!item) return null;
    return {
      "@context": "https://schema.org",
      "@type": isSeries ? "TVSeries" : "Movie",
      name: item.title,
      description: item.overview || undefined,
      image: item.poster || item.backdrop || undefined,
      genre: item.genres?.length ? item.genres : undefined,
      ...(item.year ? { datePublished: String(item.year) } : {}),
      ...(isSeries && seasons.length ? { numberOfSeasons: seasons.length } : {}),
      ...(item.rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: item.rating,
              bestRating: 10,
              ratingCount: 1,
            },
          }
        : {}),
    };
  }, [item, isSeries, seasons.length]);

  useDynamicSeo({
    title: seoTitle,
    description: seoDesc,
    image: item?.backdrop || item?.poster,
    url: `https://vexiatv.lovable.app/detalhes/${id}`,
    jsonLd: seoJsonLd,
    jsonLdId: "vexia-detalhes-jsonld",
  });




  // Recomendações relevantes: sempre relacionadas ao que está sendo assistido.
  // Pontuamos gêneros em comum, categoria da lista, franquia, proximidade de ano
  // e nota — e só caímos em preenchimento genérico se sobrar pouco.
  const recommendations = useMemo(() => {
    if (!item) return [];
    const pool = (isSeries ? series : movies).filter((m) => m.id !== item.id);
    const itemGenres = new Set((item.genres ?? []).map((g) => g.toLowerCase()));
    const norm = (s?: string | null) => (s ?? "").toLowerCase();
    const baseWords = new Set(
      norm(item.title)
        .replace(/[^\p{L}\p{N} ]+/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    const score = (m: (typeof pool)[number]) => {
      const shared = (m.genres ?? []).filter((g) => itemGenres.has(g.toLowerCase())).length;
      let s = shared * 4;
      if (m.category && item.category && norm(m.category) === norm(item.category)) s += 3;
      // Franquia / mesma coleção (palavras marcantes do título em comum)
      const titleHit = norm(m.title)
        .replace(/[^\p{L}\p{N} ]+/gu, " ")
        .split(/\s+/)
        .some((w) => w.length > 3 && baseWords.has(w));
      if (titleHit) s += 5;
      if (m.year && item.year && Math.abs(m.year - item.year) <= 5) s += 1;
      s += Math.min(2, (m.rating ?? 0) / 5);
      return s;
    };

    const ranked = pool
      .map((m) => ({ m, s: score(m) }))
      .filter((x) => x.s > 2)
      .sort((a, b) => b.s - a.s || (b.m.rating ?? 0) - (a.m.rating ?? 0))
      .map((x) => x.m);

    if (ranked.length >= 8) return ranked.slice(0, 14);

    const chosen = new Set(ranked.map((m) => m.id));
    const filler = pool
      .filter((m) => !chosen.has(m.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return [...ranked, ...filler].slice(0, 14);
  }, [item, isSeries, series, movies]);

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



  const addedAt = source?.loadedAt ? new Date(source.loadedAt) : null;
  const cast = item.castList ?? item.cast?.map((name) => ({ name, photo: "", character: "" }));
  const country = countriesLabel(item.countries);

  return (
    <main ref={scopeRef} className="vexia-safe min-h-screen bg-vexia-bg pb-10 text-vexia-text">
      <div className="px-5 pt-4 md:px-10">
        <TopNav active={isSeries ? "Séries" : "Filmes"} className="w-fit" />
      </div>

      {/* ─── Destaque com backdrop ─── */}
      {/* Altura MÍNIMA (nunca fixa): o destaque cresce conforme o conteúdo, então
          as temporadas nunca ficam cortadas quando quebram em várias linhas. */}
      <section className="relative mt-2 h-auto w-full overflow-visible min-h-[220px] md:min-h-[38vh]">
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
          <PosterArt title={item.title} kind={kind === "series" ? "series" : "movie"} compact />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-vexia-bg via-vexia-bg/70 to-black/70" />

        <div className="relative flex items-start justify-between px-5 py-3 md:px-10">
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

        <div className="relative flex flex-col gap-4 px-5 pb-5 pt-2 md:flex-row md:items-end md:px-10">
          {item.poster ? (
            <SmartImage
              src={item.poster}
              role="poster"
              alt={item.title}
              eager
              preview={false}
              sizes="140px"
              className="hidden w-[140px] shrink-0 rounded-2xl border border-vexia-purple/40 shadow-[0_18px_50px_-16px_rgb(var(--vexia-primary-rgb)/0.8)] md:block"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-xl font-black leading-tight md:text-3xl">
              {item.title}
              {item.year ? ` (${item.year})` : ""}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] font-semibold">
              <AudioTagBadge
                sources={[raw?.title, item.title, item.category, (raw as { group?: string })?.group]}
                size="md"
              />
              {item.rating > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/45 px-2 py-0.5 text-vexia-gold">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                  {item.rating.toFixed(1)}
                </span>
              ) : null}
              {country ? (
                <span className="inline-flex items-center rounded-md bg-black/45 px-2 py-0.5 text-vexia-text">
                  {country}
                </span>
              ) : null}
              {item.genres.length ? (
                <span className="inline-flex items-center rounded-md bg-black/45 px-2 py-0.5 text-vexia-purple-soft">
                  {item.genres.slice(0, 3).join(" • ")}
                </span>
              ) : null}
              {item.runtime ? (
                <span className="inline-flex items-center rounded-md bg-black/45 px-2 py-0.5 text-vexia-cyan">
                  {item.runtime}
                </span>
              ) : null}
              {isSeries ? (
                <span className="inline-flex items-center rounded-md bg-black/45 px-2 py-0.5 text-vexia-cyan">
                  {seasons.length} temp • {epList.length || item.episodes || 0} ep
                </span>
              ) : null}
            </div>

            {/* Sinopse já no destaque: menos rolagem para ler o essencial. */}
            {item.overview ? (
              <p className="mt-2 line-clamp-3 max-w-3xl text-[12.5px] leading-snug text-vexia-text/90 md:line-clamp-4">
                {item.overview}
              </p>
            ) : null}

            {isSeries && seasons.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-black tracking-[0.14em] text-vexia-purple-soft">
                  ESCOLHA A TEMPORADA
                </p>
                {/* Todas as temporadas sempre à mostra: quebram em linhas e o
                    destaque acompanha a altura — sem corte e sem rolagem oculta. */}
                <div className="flex h-auto max-w-full flex-wrap items-center gap-1.5 overflow-visible md:gap-2">
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
                        className={`vexia-focus inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none tracking-wide transition md:px-3 md:py-1.5 ${
                          active
                            ? "bg-vexia-purple text-vexia-text shadow-[0_0_24px_-6px_rgb(var(--vexia-primary-rgb)/0.9)]"
                            : "border border-vexia-purple/50 bg-black/50 text-vexia-purple-soft"
                        }`}
                      >
                        <ListVideo className="h-3.5 w-3.5 shrink-0" aria-hidden /> T
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
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onFocus={() => warmEngines((raw as { streamUrl?: string })?.streamUrl)}
                  onMouseEnter={() => warmEngines((raw as { streamUrl?: string })?.streamUrl)}
                  onClick={() => {
                    // Entrega o link já conhecido: o player toca na hora.
                    if (!isSeries) {
                      setStreamHandoff("movie", item.id, (raw as { streamUrl?: string })?.streamUrl);
                    }
                    navigate({
                      to: "/player",
                      search: {
                        type: isSeries ? "series" : "movie",
                        id: item.id,
                        ep: isSeries ? resume?.key.split("::")[1] : undefined,
                      },
                    });
                  }}
                  className="vexia-focus inline-flex items-center gap-2 rounded-full bg-vexia-purple px-8 py-2.5 text-xs font-bold tracking-wide text-vexia-text shadow-[0_0_24px_-6px_rgb(var(--vexia-primary-rgb)/0.9)]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden /> ASSISTIR
                </button>
              </div>

            )}

          </div>
        </div>
      </section>

      <div className="space-y-5 px-5 pt-5 md:px-10">
        {/* ─── Elenco ─── */}
        {cast && cast.length > 0 ? (
          <section className="space-y-2">
            <SectionHeading>ELENCO</SectionHeading>
            <div className="no-scrollbar vexia-fade-edges vexia-smooth-scroll flex gap-3 overflow-x-auto pb-1">
              {cast.map((person) => (
                <div key={person.name} className="w-[66px] shrink-0 text-center">
                  {person.photo ? (
                    <SmartImage
                      src={person.photo}
                      role="logo"
                      alt={person.name}
                      preview={false}
                      sizes="64px"
                      className="mx-auto h-14 w-14 rounded-full border-2 border-vexia-purple object-cover"
                    />
                  ) : (
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-vexia-purple bg-vexia-card text-sm font-black text-vexia-cyan">
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
                  className="h-full rounded-full bg-vexia-purple shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.9)]"
                  style={{ width: `${resume.percent}%` }}
                />
              </div>
              <button
                type="button"
                data-nav-row={2}
                tabIndex={0}
                onFocus={() => warmEngines(resumeUrl)}
                onMouseEnter={() => warmEngines(resumeUrl)}
                onClick={() => {
                  const epId = isSeries ? resume.key.split("::")[1] : undefined;
                  setStreamHandoff(isSeries ? "series" : "movie", item.id, resumeUrl, epId);
                  navigate({
                    to: "/player",
                    search: {
                      type: isSeries ? "series" : "movie",
                      id: item.id,
                      ep: epId,
                    },
                  });
                }}
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
              <EpisodeList
                key={season.number}
                seriesTitle={item.title}
                seriesYear={item.year}
                season={season.number}
                episodes={season.episodes}
                navRow={3 + si}
                audioFallback={[
                  raw?.title,
                  item.category,
                  (raw as { group?: string })?.group,
                ]}
                entryFor={(epId) => entryFor(`${item.id}::${epId}`)}
                onPlay={(ep) => {
                  // Entrega o link já conhecido: o player toca na hora.
                  setStreamHandoff("series", item.id, ep.url, ep.id);
                  navigate({
                    to: "/player",
                    search: { type: "series", id: item.id, ep: ep.id },
                  });
                }}
              />
            ))}

          </section>
        ) : null}

        {/* ─── Recomendações ─── */}
        {recommendations.length > 0 ? (
          <section className="space-y-3">
            <SectionHeading>RECOMENDAÇÕES</SectionHeading>
            <div className="no-scrollbar vexia-fade-edges vexia-smooth-scroll flex gap-3 overflow-x-auto pb-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="w-[104px] shrink-0 md:w-[124px]">
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

/** Lista de episódios com miniatura oficial, selo de áudio e progresso. */
function EpisodeList({
  seriesTitle,
  seriesYear,
  season,
  episodes,
  navRow,
  audioFallback,
  entryFor,
  onPlay,
}: {
  seriesTitle: string;
  seriesYear?: number;
  season: number;
  episodes: PlaylistEpisode[];
  navRow: number;
  audioFallback: (string | undefined | null)[];
  entryFor: (epId: string) => ProgressEntry | undefined;
  onPlay: (ep: PlaylistEpisode) => void;
}) {
  const { byNumber } = useTmdbSeason(seriesTitle, seriesYear, season);

  return (
    <ul className="space-y-2">
      {episodes.map((ep) => {
        const meta = byNumber.get(ep.number);
        const image = ep.thumb || meta?.still;
        const title = ep.title || meta?.name || `Episódio ${ep.number}`;
        const entry = entryFor(ep.id);
        const watched = isWatched(entry);
        return (
          <li key={ep.id}>
            <button
              type="button"
              data-nav-row={navRow}
              tabIndex={0}
              onFocus={() => warmEngines(ep.url)}
              onMouseEnter={() => warmEngines(ep.url)}
              onClick={() => onPlay(ep)}
              className="vexia-focus flex w-full items-center gap-3 rounded-xl border border-white/5 bg-vexia-card/70 p-2.5 text-left"
            >
              <span className="relative h-[3.9rem] w-[7rem] shrink-0 overflow-hidden rounded-lg bg-black/60">
                {image ? (
                  <SmartImage
                    src={image}
                    role="still"
                    alt={`Imagem do episódio ${ep.number}`}
                    sizes="112px"
                    className="h-full w-full object-cover"
                    fallback={<PosterArt title={title} kind="series" compact />}
                  />
                ) : (
                  <PosterArt title={title} kind="series" compact />
                )}
                {watched ? (
                  <CheckCircle2
                    className="absolute right-1 top-1 h-4 w-4 text-vexia-purple-soft"
                    aria-hidden
                  />
                ) : (
                  <Circle className="absolute right-1 top-1 h-4 w-4 text-vexia-muted" aria-hidden />
                )}
                {meta?.runtimeMin ? (
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-black text-vexia-cyan">
                    {meta.runtimeMin}min
                  </span>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <AudioTagBadge sources={[ep.title]} fallbackSources={audioFallback} alwaysShow />
                  <span className="block truncate text-sm font-bold text-vexia-text">
                    Episódio {String(ep.number).padStart(2, "0")} • {title}
                  </span>
                </span>
                {meta?.overview ? (
                  <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-vexia-muted">
                    {meta.overview}
                  </span>
                ) : null}
                {entry && !watched ? (
                  <span className="mt-1.5 block h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-vexia-purple"
                      style={{ width: `${entry.percent}%` }}
                    />
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
  );
}

