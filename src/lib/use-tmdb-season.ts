import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tmdbSeasonEpisodes } from "./tmdb.functions";
import {
  readSeasonCache,
  seasonCacheKey,
  warmSeasonStills,
  writeSeasonCache,
} from "./tmdb-season-cache";

export type TmdbEpisodeMeta = {
  number: number;
  name: string;
  overview: string;
  still: string;
  runtimeMin: number;
  airDate: string;
  rating: number;
};

/**
 * Metadados de episódios da temporada atual (carregamento sob demanda:
 * só a temporada visível é buscada, nunca a série inteira).
 */
export function useTmdbSeason(
  title: string | undefined,
  year: number | undefined,
  season: number | undefined,
) {
  const fetchSeason = useServerFn(tmdbSeasonEpisodes);

  const key = title && season !== undefined ? seasonCacheKey(title, year, season) : "";
  const cached = key ? readSeasonCache(key) : undefined;

  const { data, isPending } = useQuery({
    queryKey: ["tmdb-season", key],
    // Cache persistente: reentrar na série (ou trocar entre séries) não baixa
    // novamente nomes, sinopses nem os stills dos capítulos.
    initialData: cached,
    queryFn: async () => {
      const result = (await fetchSeason({
        data: { title: title as string, year: year || undefined, season: season as number },
      })) as TmdbEpisodeMeta[];
      if (key && result?.length) {
        writeSeasonCache(key, result);
        warmSeasonStills(result);
      }
      return result;
    },
    enabled: !!title && season !== undefined && season >= 0,
    staleTime: 1000 * 60 * 60 * 24 * 7,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Identidade estável do Map: evita re-render em cascata da lista de capítulos.
  const byNumber = useMemo(() => {
    const map = new Map<number, TmdbEpisodeMeta>();
    for (const item of data ?? []) map.set(item.number, item);
    return map;
  }, [data]);

  return { byNumber, isPending };
}
