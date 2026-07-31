import { ChevronLeft, ChevronRight, Clock, Play } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistEpisode } from "../../lib/m3u";
import { useProgress } from "../../lib/progress-store";
import { useSettings } from "../../lib/settings-store";
import { useTmdbSeason } from "../../lib/use-tmdb-season";
import { ConfirmDialog } from "./ConfirmDialog";
import { SmartImage } from "./SmartImage";
import { AudioTagBadge } from "./AudioTagBadge";


type Props = {
  seriesId: string;
  seriesTitle: string;
  seriesYear?: number;
  seriesPoster?: string;
  episodes: PlaylistEpisode[];
  currentEpisodeId?: string;
  onSelect: (episode: PlaylistEpisode) => void;
};

function minutesLabel(min: number) {
  if (!min) return "";
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} minutos`;
}


function EpisodeCarouselBase({
  seriesId,
  seriesTitle,
  seriesYear,
  seriesPoster,
  episodes,
  currentEpisodeId,
  onSelect,
}: Props) {
  const seasons = useMemo(
    () => Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b),
    [episodes],
  );
  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId);
  const [season, setSeason] = useState<number>(currentEpisode?.season ?? seasons[0] ?? 1);
  const [pending, setPending] = useState<PlaylistEpisode | null>(null);
  const [dontAsk, setDontAsk] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const { settings, toggle, set } = useSettings();
  const quickSwitch = settings.episodeQuickSwitch;

  useEffect(() => {
    if (currentEpisode) setSeason(currentEpisode.season);
  }, [currentEpisode?.season]); // eslint-disable-line react-hooks/exhaustive-deps

  // Somente os episódios da temporada visível ficam em memória/render.
  const seasonEpisodes = useMemo(
    () => episodes.filter((e) => e.season === season).sort((a, b) => a.number - b.number),
    [episodes, season],
  );

  const { byNumber } = useTmdbSeason(seriesTitle, seriesYear, season);
  const { entryFor } = useProgress(seriesId);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentEpisodeId, season]);

  /* ── Setas de navegação (mouse/PC): só aparecem quando há para onde ir ── */
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setEdges({ left: track.scrollLeft > 8, right: track.scrollLeft < max - 8 });
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [seasonEpisodes.length]);

  /** Rola exatamente uma "página" de cards visíveis. */
  const scrollPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const step = Math.max(240, Math.round(track.clientWidth * 0.8));
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const choose = (episode: PlaylistEpisode) => {
    if (episode.id === currentEpisodeId) return;
    if (quickSwitch) onSelect(episode);
    else {
      setDontAsk(false);
      setPending(episode);
    }
  };

  const confirmPending = () => {
    const target = pending;
    setPending(null);
    if (dontAsk) set("episodeQuickSwitch", true);
    if (target) onSelect(target);
  };

  const toggleQuick = () => toggle("episodeQuickSwitch");


  return (
    <section className="bg-transparent px-4 pb-3 pt-2 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-white">{seriesTitle}</h2>
          {currentEpisode ? (
            <p className="text-xs font-medium text-[#B0B0B0]">
              Temporada {currentEpisode.season} — Episódio{" "}
              {String(currentEpisode.number).padStart(2, "0")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleQuick}
          className={`vexia-focus rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            quickSwitch
              ? "border-vexia-purple bg-vexia-purple/20 text-vexia-cyan"
              : "border-white/15 text-[#B0B0B0]"
          }`}
        >
          {quickSwitch ? "Troca imediata: ativada" : "Troca imediata: desativada"}
        </button>
      </div>

      {/* Seletor de temporadas */}
      {seasons.length > 1 ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#B0B0B0]">TEMPORADAS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {seasons.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(s)}
                aria-pressed={s === season}
                className={`vexia-focus rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                  s === season
                    ? "bg-vexia-purple text-white shadow-[0_0_16px_-2px_rgb(var(--vexia-primary-rgb)/0.9)]"
                    : "bg-[#1A1A1A] text-white hover:bg-[#242424]"
                }`}
              >
                T{s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Carrossel de episódios */}
      <div className="relative mt-4">
        <button
          type="button"
          aria-label="Episódios anteriores"
          onClick={() => scrollPage(-1)}
          disabled={!edges.left}
          className="vexia-focus absolute left-0 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-vexia-purple/50 bg-black/85 shadow-[0_0_22px_-6px_rgb(var(--vexia-primary-rgb)/0.95)] backdrop-blur-sm transition-opacity duration-200 hover:border-vexia-cyan/70 disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft className="h-6 w-6 text-vexia-cyan" aria-hidden />
        </button>

        <div
          ref={trackRef}
          className="vexia-fade-edges vexia-smooth-scroll flex snap-x gap-3 overflow-x-auto pb-3 vexia-scroll"
        >
          {seasonEpisodes.map((episode) => {
            const meta = byNumber.get(episode.number);
            const active = episode.id === currentEpisodeId;
            const progress = entryFor(`${seriesId}::${episode.id}`);
            const pct = Math.min(100, Math.round(progress?.percent ?? 0));
            const thumb = meta?.still || episode.thumb || seriesPoster || "";
            const name = meta?.name || episode.title || `Episódio ${episode.number}`;
            return (
              <button
                key={episode.id}
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => choose(episode)}
                aria-current={active}
                data-episode-card="true"
                data-active={active ? "true" : "false"}
                className={`vexia-focus w-[190px] shrink-0 snap-start overflow-hidden rounded-lg bg-[#1A1A1A] text-left transition-transform duration-200 ${
                  active
                    ? "scale-105 border-2 border-vexia-purple shadow-[0_0_22px_-2px_rgb(var(--vexia-secondary-rgb)/0.55)]"
                    : "border border-white/5 hover:border-vexia-purple/50"
                }`}
              >
                <div className="relative aspect-video w-full bg-black">
                  {thumb ? (
                    <SmartImage
                      src={thumb}
                      role="still"
                      sizes="(min-width: 1600px) 22vw, 40vw"
                      alt={`Cena do episódio ${episode.number} — ${name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-[#B0B0B0]">
                      EP {String(episode.number).padStart(2, "0")}
                    </div>
                  )}
                  {active ? (
                    <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-vexia-purple shadow-[0_0_14px_rgb(var(--vexia-secondary-rgb)/0.8)]">
                      <Play className="h-3.5 w-3.5 fill-current text-white" aria-hidden />
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1 p-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-vexia-cyan">
                    EP {String(episode.number).padStart(2, "0")}
                    <AudioTagBadge sources={[episode.title]} fallbackSources={[seriesTitle]} />
                  </p>
                  <p className="line-clamp-1 text-xs font-semibold text-white">{name}</p>

                  {meta?.runtimeMin || episode.runtimeMin ? (
                    <p className="flex items-center gap-1 text-[11px] text-[#B0B0B0]">
                      <Clock className="h-3 w-3" aria-hidden />{" "}
                      {minutesLabel(meta?.runtimeMin || episode.runtimeMin)}
                    </p>
                  ) : null}
                  {pct > 0 ? (
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="text-[10px] font-semibold text-[#B0B0B0]">{pct}%</span>
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Próximos episódios"
          onClick={() => scrollPage(1)}
          disabled={!edges.right}
          className="vexia-focus absolute right-0 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-vexia-purple/50 bg-black/85 shadow-[0_0_22px_-6px_rgb(var(--vexia-primary-rgb)/0.95)] backdrop-blur-sm transition-opacity duration-200 hover:border-vexia-cyan/70 disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight className="h-6 w-6 text-vexia-cyan" aria-hidden />
        </button>
      </div>

      {/* Informações do episódio em reprodução */}
      {currentEpisode ? (
        <div className="mt-4 max-w-3xl space-y-1">
          <p className="text-sm font-bold text-white">
            {byNumber.get(currentEpisode.number)?.name || currentEpisode.title}
          </p>
          <p className="text-xs leading-relaxed text-[#B0B0B0]">
            {byNumber.get(currentEpisode.number)?.overview ||
              currentEpisode.overview ||
              "Sinopse indisponível para este episódio."}
          </p>
        </div>
      ) : null}

      {/* Confirmação de troca de episódio */}
      <ConfirmDialog
        open={!!pending}
        title="Trocar de episódio?"
        message={
          pending
            ? `T${pending.season} • EP ${String(pending.number).padStart(2, "0")} — ${
                byNumber.get(pending.number)?.name || pending.title
              }`
            : undefined
        }
        confirmLabel="REPRODUZIR"
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={dontAsk}
          onClick={() => setDontAsk((v) => !v)}
          className="vexia-focus mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-[#B0B0B0]"
        >
          <span
            className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
              dontAsk
                ? "border-vexia-purple bg-vexia-purple text-white"
                : "border-white/25 text-transparent"
            }`}
            aria-hidden
          >
            ✓
          </span>
          Não perguntar novamente (troca imediata)
        </button>
      </ConfirmDialog>

    </section>
  );
}

/**
 * Memoizado: o player atualiza o tempo várias vezes por segundo — sem isso o
 * carrossel de capítulos re-renderizava junto e a troca de canal/episódio
 * engasgava. Só re-renderiza quando a lista ou o episódio atual mudam.
 */
export const EpisodeCarousel = memo(EpisodeCarouselBase);
