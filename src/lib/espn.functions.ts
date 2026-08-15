import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Interface simplificada para o retorno dos jogos da ESPN.
 */
export interface EspnGame {
  id: string;
  name: string;
  shortName: string;
  league?: {
    name: string;
    logo?: string;
  };
  date: string;
  status: {
    type: {
      name: string;
      description: string;
      state: "pre" | "in" | "post";
    };
    displayClock: string;
    period: number;
  };
  competitors: Array<{
    id: string;
    team: {
      id: string;
      location: string;
      name: string;
      abbreviation: string;
      displayName: string;
      logo: string;
    };
    score: string;
    homeAway: "home" | "away";
  }>;
  broadcasts?: Array<{
    market: string;
    names: string[];
  }>;
}
/**
 * Busca detalhes de um jogo específico na ESPN (escalações, gols, eventos).
 */
export const getEspnGameDetails = createServerFn({ method: "GET" })
  .validator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { id } = data;
      // URL para detalhes do jogo (summary)
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`,
        { 
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(8000)
        }
      );
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar detalhes do jogo ESPN:", error);
      return null;
    }
  });

/**
 * Busca jogos de futebol na API pública da ESPN.
 */
export const getLiveFootballScores = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    return (data as { date?: string }) || {};
  })
  .handler(async ({ data }) => {
    try {
      const targetDate = data?.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
      const dateParam = targetDate.replace(/-/g, '');

      const leagues = [
        "bra.1", "bra.2", "bra.cup", "bra.nordeste", 
        "eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "por.1",
        "arg.1", "mex.1", "uefa.champions", "uefa.europa",
        "conmebol.libertadores", "conmebol.sudamericana",
        "fifa.world", "conmebol.america", "fifa.friendly"
      ];
      
      const allEvents: EspnGame[] = [];
      
      const results = await Promise.allSettled(leagues.map(async (league) => {
        try {
          const response = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateParam}`,
            { 
              headers: { "Accept": "application/json" },
              signal: AbortSignal.timeout(3500)
            }
          );
          
          if (!response.ok) return [];
          
          const json = await response.json();
          return (json.events || []).map((event: any) => ({
            id: event.id,
            name: event.name,
            shortName: event.shortName,
            league: {
              name: json.leagues?.[0]?.name || "",
              logo: json.leagues?.[0]?.logos?.[0]?.href
            },
            date: event.date,
            status: {
              type: {
                name: event.status.type.name,
                description: event.status.type.description,
                state: event.status.type.state,
              },
              displayClock: event.status.displayClock,
              period: event.status.period,
            },
            competitors: event.competitions[0].competitors.map((c: any) => ({
              id: c.id,
              team: {
                id: c.team.id,
                location: c.team.location,
                name: c.team.name,
                abbreviation: c.team.abbreviation,
                displayName: c.team.displayName,
                logo: c.team.logo,
              },
              score: c.score,
              homeAway: c.homeAway,
            })),
            broadcasts: event.competitions[0].broadcasts?.map((b: any) => ({
              market: b.market,
              names: b.names
            }))
          }));
        } catch (e) {
          return [];
        }
      }));

      results.forEach(result => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          allEvents.push(...result.value);
        }
      });

      return { events: allEvents };
    } catch (error) {
      console.error("Erro fatal ao buscar placares ESPN:", error);
      return { events: [] };
    }
  });
