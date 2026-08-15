import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Busca o escudo de um time de futebol usando a API do TheSportsDB.
 */
export const searchTeamLogo = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ teamName: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const teamName = data.teamName;
    try {
      // Limpeza básica do nome do time
      const cleanName = teamName
        .replace(/\b(FC|SC|AC|AFC|CF|UD|CD|SD|RC|CR|EC|FBC|CRB)\b/gi, "")
        .trim();

      const response = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(cleanName)}`,
        { 
          signal: AbortSignal.timeout(4000),
          headers: { "Accept": "application/json" }
        }
      );

      if (!response.ok) return null;
      const json = await response.json();

      if (json && json.teams && json.teams.length > 0) {
        return json.teams[0].strTeamBadge || json.teams[0].strTeamLogo || null;
      }

      return null;
    } catch (error) {
      // Falha silenciosa para não quebrar a UI
      return null;
    }
  });
