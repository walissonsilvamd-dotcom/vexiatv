import { useNavigate } from "@tanstack/react-router";
import { Clapperboard, Film, Tv, X } from "lucide-react";
import { useMemo, useState } from "react";
import { usePlaylist } from "../../lib/playlist-store";
import { formatDuration, matchWatch, type WatchEntry } from "../../lib/history-store";
import { SmartImage } from "./SmartImage";

/** Resolve o item salvo com a lista atual (id → url → nome normalizado). */
export function useResolvedHistory(entries: WatchEntry[]) {
  const { channels, movies, series } = usePlaylist();
  return useMemo(
    () =>
      entries.map((entry) => {
        const pool =
          entry.kind === "channel" ? channels : entry.kind === "movie" ? movies : series;
        const live = matchWatch(entry, pool as never) as
          | { id: string; poster?: string; logo?: string; url?: string; streamUrl?: string }
          | undefined;
        return {
          ...entry,
          liveId: live?.id,
          livePoster: live?.poster ?? live?.logo,
        };
      }),
    [entries, channels, movies, series],
  );
}

export type ResolvedWatch = WatchEntry & { liveId?: string; livePoster?: string };

/** Abre o conteúdo no player (o player pergunta se deseja continuar). */
export function useOpenWatch() {
  const navigate = useNavigate();
  return (entry: ResolvedWatch) => {
    const id = entry.liveId ?? entry.id;
    if (entry.kind === "channel") {
      void navigate({ to: "/player", search: { type: "live", id } });
      return;
    }
    if (entry.kind === "series") {
      void navigate({
        to: "/player",
        search: { type: "series", id, ep: entry.episodeId },
      });
      return;
    }
    void navigate({ to: "/player", search: { type: "movie", id } });
  };
}

export function WatchProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-[4px] bg-white/20">
      <div
        className="h-full rounded-[4px] bg-gradient-to-r from-[#7B2FBE] to-[#00C8FF]"
        style={{ width: `${Math.max(3, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

/** Card de histórico / continuar assistindo. */
export function WatchCard({
  entry,
  onOpen,
  onRemove,
  compact = false,
  navRow,
}: {
  entry: ResolvedWatch;
  onOpen: () => void;
  onRemove?: () => void;
  compact?: boolean;
  navRow?: number;
}) {
  const [broken, setBroken] = useState(false);
  const isLive = entry.kind === "channel";
  const image = entry.livePoster || entry.poster;
  const Icon = isLive ? Tv : entry.kind === "series" ? Clapperboard : Film;

  const subtitle = isLive
    ? entry.category || "Canal ao vivo"
    : entry.kind === "series" && entry.season
      ? `T${entry.season} • E${entry.episode ?? 1}`
      : `${formatDuration(entry.positionSec)} / ${formatDuration(entry.durationSec)}`;

  return (
    <div className={`group relative ${compact ? "w-[124px] shrink-0 md:w-[150px]" : ""}`}>
      <button
        type="button"
        tabIndex={0}
        data-nav-row={navRow}
        onClick={onOpen}
        className="vexia-focus block w-full overflow-hidden rounded-lg border border-white/10 bg-[#1A1A1A] text-left transition-all duration-300 hover:-translate-y-1 hover:border-vexia-purple hover:shadow-[0_0_26px_rgba(0,200,255,0.25)]"
      >
        <div className={`relative w-full overflow-hidden ${isLive ? "aspect-video" : "aspect-[2/3]"}`}>
          {image && !broken ? (
            <SmartImage
              src={image}
              role={isLive ? "logo" : "poster"}
              alt={entry.name}
              className={`h-full w-full ${isLive ? "object-contain p-3" : "object-cover"} transition-transform duration-500 group-hover:scale-105`}
            />
          ) : (
            <PosterArt title={entry.name} kind={isLive ? "live" : "movie"} compact={isLive} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
          <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-black/70 backdrop-blur-md">
            <Icon className="h-3 w-3 text-vexia-cyan" aria-hidden />
          </span>
          {isLive ? (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-red-600/90 px-2 py-0.5 text-[9px] font-black tracking-wider text-white">
              AO VIVO
            </span>
          ) : (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-black tabular-nums text-vexia-cyan">
              {Math.round(entry.percent)}%
            </span>
          )}
        </div>
        <div className="space-y-1 border-t border-white/5 p-2.5">
          <p className="truncate text-xs font-extrabold text-vexia-text">{entry.name}</p>
          <p className="truncate text-[11px] font-medium text-vexia-cyan">{subtitle}</p>
          {!isLive ? <WatchProgressBar percent={entry.percent} /> : null}
        </div>
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${entry.name} do histórico`}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/70 opacity-0 backdrop-blur-md transition-all hover:scale-105 hover:border-vexia-purple focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5 text-white" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
