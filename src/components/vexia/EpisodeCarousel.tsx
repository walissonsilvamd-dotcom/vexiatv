import { ChevronLeft, ChevronRight, Clock, Play, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistEpisode } from "../../lib/m3u";
import { useProgress } from "../../lib/progress-store";
import { useTmdbSeason } from "../../lib/use-tmdb-season";

type Props = {
  seriesId: string;
  seriesTitle: string;
  seriesYear?: number;
  seriesPoster?: string;
  episodes: PlaylistEpisode[];
  currentEpisodeId?: string;
  onSelect: (episode: PlaylistEpisode) => void;
};

const QUICK_KEY = "vexia:episode-quick-switch";

function readQuick() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(QUICK_KEY) === "1";
}

function minutesLabel(min: number) {
  if (!min) return "";
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min} minutos`;
}

export function EpisodeCarousel({
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
  const [quickSwitch, setQuickSwitch] = useState(false);
  const [pending, setPending] = useState<PlaylistEpisode | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setQuickSwitch(readQuick()), []);
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

  const scrollBy = (delta: number) =>
    trackRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  const choose = (episode: PlaylistEpisode) => {
    if (episode.id === currentEpisodeId) return;
    if (quickSwitch) onSelect(episode);
    else setPending(episode);
  };

  const toggleQuick = () => {
    setQuickSwitch((v) => {
      const next = !v;
      window.localStorage.setItem(QUICK_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <section className="bg-[#050505] px-5 pb-10 pt-6 md:px-10">
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
                    ? "bg-vexia-purple text-white shadow-[0_0_16px_-2px_rgba(123,47,190,0.9)]"
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
          onClick={() => scrollBy(-480)}
          className="vexia-focus absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 md:grid"
        >
          <ChevronLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
        </button>

        <div
          ref={trackRef}
          className="flex snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {seasonEpisodes.map((episode) => {
            const meta = byNumber.get(episode.number);
            const active = episode.id === currentEpisodeId;
            const progress = entryFor(`${seriesId}::${episode.id}`);
            const pct = Math.min(100, Math.round(progress?.percent ?? 0));
            const thumb = episode.thumb || meta?.still || seriesPoster || "";
            const name = meta?.name || episode.title || `Episódio ${episode.number}`;
            return (
              <button
                key={episode.id}
                ref={active ? activeRef : undefined}
                type="button"
                onClick={() => choose(episode)}
                aria-current={active}
                className={`vexia-focus w-[190px] shrink-0 snap-start overflow-hidden rounded-lg bg-[#1A1A1A] text-left transition-transform duration-200 ${
                  active
                    ? "scale-105 border-2 border-vexia-purple shadow-[0_0_22px_-2px_rgba(0,200,255,0.55)]"
                    : "border border-white/5 hover:border-vexia-purple/50"
                }`}
              >
                <div className="relative aspect-video w-full bg-black">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Cena do episódio ${episode.number} — ${name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-[#B0B0B0]">
                      EP {String(episode.number).padStart(2, "0")}
                    </div>
                  )}
                  {active ? (
                    <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-vexia-purple shadow-[0_0_14px_rgba(0,200,255,0.8)]">
                      <Play className="h-3.5 w-3.5 fill-current text-white" aria-hidden />
                    </span>
                  ) : null}
                  {meta?.rating ? (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-vexia-gold">
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      {meta.rating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1 p-2.5">
                  <p className="text-[11px] font-bold tracking-wide text-vexia-cyan">
                    EP {String(episode.number).padStart(2, "0")}
                  </p>
                  <p className="line-clamp-1 text-xs font-semibold text-white">{name}</p>
                  {meta?.runtimeMin ? (
                    <p className="flex items-center gap-1 text-[11px] text-[#B0B0B0]">
                      <Clock className="h-3 w-3" aria-hidden /> {minutesLabel(meta.runtimeMin)}
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
          onClick={() => scrollBy(480)}
          className="vexia-focus absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 md:grid"
        >
          <ChevronRight className="h-5 w-5 text-vexia-cyan" aria-hidden />
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
              "Sinopse indisponível para este episódio."}
          </p>
        </div>
      ) : null}

      {/* Confirmação de troca */}
      {pending ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f] p-5 text-center">
            <p className="text-sm font-bold text-white">Reproduzir episódio?</p>
            <p className="mt-1 text-xs text-vexia-cyan">
              T{pending.season} • EP {String(pending.number).padStart(2, "0")} —{" "}
              {byNumber.get(pending.number)?.name || pending.title}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  const target = pending;
                  setPending(null);
                  onSelect(target);
                }}
                className="vexia-focus rounded-full bg-vexia-purple px-5 py-2 text-xs font-bold text-white"
              >
                REPRODUZIR
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="vexia-focus rounded-full border border-white/20 px-5 py-2 text-xs font-bold text-white"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
