import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { MediaItem } from "../data/vexia";
import { readTmdbCache, resolveTmdb, tmdbCacheKey } from "./tmdb-cache";
import { tmdbSearch } from "./tmdb.functions";

const STALE_TIME = 1000 * 60 * 60 * 24 * 7;
const GC_TIME = 1000 * 60 * 60;

function needsEnrichment(item: MediaItem) {
  return item.rating === 0 || !item.overview || !item.poster || !item.backdrop;
}

/** No card só interessa capa + nota — evita buscas desnecessárias na grade. */
function needsCardEnrichment(item: MediaItem) {
  return !item.poster || item.rating === 0;
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

function buildQuery<T extends MediaItem>(
  item: T,
  kind: "movie" | "series",
  search: SearchFn,
  mode: "full" | "card" = "full",
  force = false,
) {
  const key = tmdbCacheKey(item.title, item.year || undefined, kind);
  const cached = readTmdbCache(key);
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
    // Cache local já resolvido: renderiza na hora, sem request nenhum.
    initialData: cached ? cached.value : undefined,
    enabled: force || (mode === "card" ? needsCardEnrichment(item) : needsEnrichment(item)),
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
  mode: "full" | "card" = "full",
  /** Força a busca no TMDB (ex.: a capa da lista quebrou). */
  force = false,
): { data: T | undefined; isPending: boolean; isError: boolean } {
  const search = useServerFn(tmdbSearch);
  const base = item
    ? buildQuery(item, kind, search, mode, force)
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
  return useTmdbHeroesStatus(items, kind).items;
}

/** Mesma busca do useTmdbHeroes, mas expondo o progresso do enriquecimento. */
export function useTmdbHeroesStatus<T extends MediaItem>(
  items: T[],
  kind: "movie" | "series",
): { items: T[]; pending: boolean; settled: number; total: number } {
  const search = useServerFn(tmdbSearch);
  const queries = useQueries({
    queries: items.map((item) => buildQuery(item, kind, search)),
  });

  const settled = queries.reduce((total, query) => total + (query.isPending ? 0 : 1), 0);

  return {
    items: items.map((item, i) =>
      mergeEnriched(item, queries[i]?.data as Partial<MediaItem> | null | undefined),
    ),
    pending: settled < queries.length,
    settled,
    total: queries.length,
  };
}

