import { useEffect, useState } from "react";
import type { PlaylistEpisode, PlaylistSeries } from "../lib/m3u";
import { usePlaylist } from "../lib/playlist-store";
import { fetchXtreamEpisodes } from "../lib/xtream-catalog";

/**
 * Episódios de uma série. Listas M3U já trazem tudo em memória; no caminho
 * rápido (painel Xtream) os episódios são buscados só ao abrir a série,
 * o que mantém o carregamento inicial leve.
 */
export function useSeriesEpisodes(serie: PlaylistSeries | null | undefined) {
  const { source } = usePlaylist();
  const local = serie?.episodesList ?? [];
  const [remote, setRemote] = useState<PlaylistEpisode[]>([]);
  const [loading, setLoading] = useState(false);

  const seriesId = serie?.seriesId ?? 0;
  const url = source?.url ?? "";

  useEffect(() => {
    setRemote([]);
    if (local.length > 0 || !seriesId || !url) return;
    let alive = true;
    setLoading(true);
    fetchXtreamEpisodes(url, seriesId)
      .then((list) => {
        if (alive) setRemote(list);
      })
      .catch((err) => console.error("[vexia] falha ao carregar episódios", err))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, url, local.length]);

  return { episodes: local.length > 0 ? local : remote, loading };
}
