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
    return {
      title: "Matrix",
      year: 1999,
      rating: 8.7,
      genres: ["Action", "Sci-Fi"],
      overview: "Teste de serialização",
      backdrop: "https://image.tmdb.org/t/p/original/h8gH9u7Mh9p9o9o9o9o9o9o9o9.jpg",
      poster: "https://image.tmdb.org/t/p/w780/h8gH9u7Mh9p9o9o9o9o9o9o9o9.jpg",
    } as any;
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
