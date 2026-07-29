import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchSeasonEpisodes, searchTmdb, type TmdbKind } from "./tmdb.server";

export const tmdbSearch = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        title: z.string().min(1),
        year: z.number().optional(),
        kind: z.enum(["movie", "tv"]),
        language: z.string().default("pt-BR"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const credential = process.env.TMDB_READ_TOKEN || process.env.TMDB_API_KEY;
    if (!credential) throw new Error("TMDB credentials not configured");
    return searchTmdb(credential, data.title, data.year, data.kind as TmdbKind, data.language);
  });

export const tmdbSeasonEpisodes = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        title: z.string().min(1),
        year: z.number().optional(),
        season: z.number().int().min(0),
        language: z.string().default("pt-BR"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const credential = process.env.TMDB_READ_TOKEN || process.env.TMDB_API_KEY;
    if (!credential) throw new Error("TMDB credentials not configured");
    return fetchSeasonEpisodes(credential, data.title, data.year, data.season, data.language);
  });
