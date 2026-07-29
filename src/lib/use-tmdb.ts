import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import type { MediaItem } from "../data/vexia";
import { tmdbSearch } from "./tmdb.functions";

function needsEnrichment(item: MediaItem) {
  return item.rating === 0 || !item.overview || !item.poster || !item.backdrop;
}

export function useTmdbItem(
  item: MediaItem | null | undefined,
  kind: "movie" | "series",
): { data: MediaItem | undefined; isPending: boolean; isError: boolean } {
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
      return { ...item, ...result, id: item.id } as MediaItem;
    },
    enabled: !!item && needsEnrichment(item),
    staleTime: 1000 * 60 * 60 * 24,
  });

  const merged = useMemo(() => {
    if (!item) return undefined;
    if (!data) return item;
    // O TMDB retorna dados complementares; preservamos campos existentes na lista quando não forem vazios.
    return {
      ...data,
      title: item.title || data.title,
      genres: data.genres?.length ? data.genres : item.genres,
      overview: data.overview || item.overview,
      backdrop: data.backdrop || item.backdrop,
      poster: data.poster || item.poster,
    } as MediaItem;
  }, [item, data]);

  return { data: merged, isPending, isError };
}

export function useTmdbHeroes(items: MediaItem[], kind: "movie" | "series"): MediaItem[] {
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
        return { ...item, ...result, id: item.id } as MediaItem;
      },
      enabled: !!item && needsEnrichment(item),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  });

  return items.map((item, i) => {
    const data = queries[i].data;
    if (!data) return item;
    return {
      ...data,
      title: item.title || data.title,
      genres: data.genres?.length ? data.genres : item.genres,
      overview: data.overview || item.overview,
      backdrop: data.backdrop || item.backdrop,
      poster: data.poster || item.poster,
    } as MediaItem;
  });
}

