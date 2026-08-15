import { createServerFn } from "@tanstack/react-start";

/**
 * Busca o escudo de um time de futebol usando a API do TheSportsDB.
 * A API do TheSportsDB é gratuita e possui uma base de dados extensa de escudos.
 */
export const searchTeamLogo = createServerFn({ method: "GET" })
  .inputValidator((teamName: string) => teamName)
  .handler(async ({ data: teamName }) => {
    try {
      // Limpeza básica do nome do time
      const cleanName = teamName
        .replace(/\b(FC|SC|AC|AFC|CF|UD|CD|SD|RC|CR|EC|FBC|CRB)\b/gi, "")
        .trim();

      // TheSportsDB - busca de time por nome
      const response = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(cleanName)}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return null;
      const data = await response.json();

      if (data.teams && data.teams.length > 0) {
        // Retorna o escudo (strTeamBadge) do primeiro resultado
        return data.teams[0].strTeamBadge || data.teams[0].strTeamLogo || null;
      }

      return null;
    } catch (error) {
      console.error(`Erro ao buscar escudo para ${teamName}:`, error);
      return null;
    }
  });
