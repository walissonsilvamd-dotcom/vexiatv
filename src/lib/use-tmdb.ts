import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { MediaItem } from "../data/vexia";
import { tmdbSearch } from "./tmdb.functions";

function needsEnrichment(item: MediaItem) {
  return item.rating === 0 || !item.overview || !item.poster || !item.backdrop;
}

function mergeEnriched<T extends MediaItem>(item: T, enriched: Partial<MediaItem> | undefined): T {
  if (!enriched) return item;
  return {
    ...item,
    ...enriched,
    title: enriched.title || item.title,
    genres: enriched.genres?.length ? enriched.genres : item.genres,
    overview: enriched.overview || item.overview,
    backdrop: enriched.backdrop || item.backdrop,
    poster: enriched.poster || item.poster,
  } as T;
}

export function useTmdbItem<T extends MediaItem>(
  item: T | null | undefined,
  kind: "movie" | "series",
): { data: T | undefined; isPending: boolean; isError: boolean } {
  const search = useServerFn(tmdbSearch);

  const { data, isPending, isError } = useQuery({
    queryKey: ["tmdb", item?.id, item?.title, item?.year, kind],
    queryFn: async () => {
      if (!item) return undefined;
      const result = await search({
        data: {
          title: item.title,
          year: item.year || undefined,
          kind: kind === "series" ? "tv" : "movie",
        },
      });
      if (!result) return undefined;
      // Mescla o item da lista com o do TMDB, mantendo o ID e o link original.
      return mergeEnriched(item, result as Partial<MediaItem>);
    },
    enabled: !!item && needsEnrichment(item),
    staleTime: 1000 * 60 * 60 * 24,
  });

  return { data, isPending, isError };
}

export function useTmdbHeroes<T extends MediaItem>(items: T[], kind: "movie" | "series"): T[] {
  const search = useServerFn(tmdbSearch);
  const queries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["tmdb", item.id, item.title, item.year, kind],
      queryFn: async () => {
        const result = await search({
          data: {
            title: item.title,
            year: item.year || undefined,
            kind: kind === "series" ? "tv" : "movie",
          },
        });
        if (!result) return undefined;
        return mergeEnriched(item, result as Partial<MediaItem>);
      },
      enabled: !!item && needsEnrichment(item),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  return items.map((item, i) => queries[i].data ?? item);
}
