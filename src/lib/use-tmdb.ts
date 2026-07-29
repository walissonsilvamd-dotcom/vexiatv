import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { MediaItem } from "../data/vexia";
import { resolveTmdb, tmdbCacheKey } from "./tmdb-cache";
import { tmdbSearch } from "./tmdb.functions";

const STALE_TIME = 1000 * 60 * 60 * 24 * 7;
const GC_TIME = 1000 * 60 * 60;

function needsEnrichment(item: MediaItem) {
  return item.rating === 0 || !item.overview || !item.poster || !item.backdrop;
}

function mergeEnriched<T extends MediaItem>(item: T, enriched: Partial<MediaItem> | null | undefined): T {
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

type SearchFn = ReturnType<typeof useServerFn<typeof tmdbSearch>>;

function buildQuery<T extends MediaItem>(item: T, kind: "movie" | "series", search: SearchFn) {
  const key = tmdbCacheKey(item.title, item.year || undefined, kind);
  return {
    // Chave normalizada: itens duplicados na lista compartilham o mesmo cache.
    queryKey: ["tmdb", key] as const,
    queryFn: async () => {
      const result = await resolveTmdb(key, () =>
        search({
          data: {
            title: item.title,
            year: item.year || undefined,
            kind: kind === "series" ? ("tv" as const) : ("movie" as const),
          },
        }) as Promise<Partial<MediaItem> | null>,
      );
      return result ?? null;
    },
    enabled: needsEnrichment(item),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  };
}

export function useTmdbItem<T extends MediaItem>(
  item: T | null | undefined,
  kind: "movie" | "series",
): { data: T | undefined; isPending: boolean; isError: boolean } {
  const search = useServerFn(tmdbSearch);
  const base = item
    ? buildQuery(item, kind, search)
    : { queryKey: ["tmdb", "idle"] as const, queryFn: async () => null, enabled: false };

  const { data, isPending, isError } = useQuery({
    ...base,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: item ? mergeEnriched(item, data as Partial<MediaItem> | null) : undefined,
    isPending,
    isError,
  };
}

export function useTmdbHeroes<T extends MediaItem>(items: T[], kind: "movie" | "series"): T[] {
  const search = useServerFn(tmdbSearch);
  const queries = useQueries({
    queries: items.map((item) => buildQuery(item, kind, search)),
  });

  return items.map((item, i) =>
    mergeEnriched(item, queries[i]?.data as Partial<MediaItem> | null | undefined),
  );
}
