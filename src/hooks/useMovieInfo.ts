import { useEffect, useState } from "react";
import type { MediaItem } from "../data/vexia";
import { usePlaylist } from "../lib/playlist-store";
import { fetchXtreamVodInfo, xtreamStreamId, type XtreamVodInfo } from "../lib/xtream-catalog";

/**
 * Detalhes do filme direto do painel (`get_vod_info`).
 *
 * Chega instantâneo quando o card já foi focado na grade (prefetch) e fica em
 * cache persistente, então reabrir o mesmo filme não custa rede.
 */
export function useMovieInfo(movie: MediaItem | null | undefined, enabled = true) {
  const { source } = usePlaylist();
  const [info, setInfo] = useState<XtreamVodInfo | null>(null);

  const url = source?.url ?? "";
  const streamId = xtreamStreamId((movie as { streamUrl?: string } | null | undefined)?.streamUrl);

  useEffect(() => {
    setInfo(null);
    if (!enabled || !url || !streamId) return;
    let alive = true;
    fetchXtreamVodInfo(url, streamId)
      .then((data) => {
        if (alive) setInfo(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url, streamId, enabled]);

  return info;
}
