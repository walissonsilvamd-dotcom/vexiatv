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
    return (data as any) || {};
  })
  .handler(async ({ data }: { data: any }) => {
    try {
      const targetDate = data?.date || new Date().toISOString().split('T')[0].replace(/-/g, '');
      const dateParam = targetDate.replace(/-/g, '');

      // Buscamos várias ligas
      const dateParam = targetDate.replace(/-/g, '');


      // Buscamos várias ligas para aumentar a chance de encontrar os jogos da lista
      const leagues = [
        "bra.1", "bra.2", "bra.3", "bra.cup", "bra.nordeste", // Brasil
        "eng.1", "eng.2", "eng.fa", "eng.league_cup",        // Inglaterra
        "esp.1", "esp.2", "esp.cup",                         // Espanha
        "ita.1", "ita.2", "ita.cup",                         // Itália
        "ger.1", "ger.2",                                    // Alemanha
        "fra.1", "fra.2", "fra.cup",                         // França
        "por.1", "por.2",                                    // Portugal
        "arg.1", "mex.1", "ned.1", "sau.1",                  // Outros
        "uefa.champions", "uefa.europa", "uefa.nations",     // UEFA
        "conmebol.libertadores", "conmebol.sudamericana",    // CONMEBOL
        "fifa.world", "conmebol.america", "fifa.friendly"    // Seleções
      ];
      
      const allEvents: EspnGame[] = [];
      
      // Executa as buscas em paralelo para não travar o tempo total por uma liga lenta
      const results = await Promise.allSettled(leagues.map(async (league) => {
        try {
          const response = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateParam}`,
            { 
              headers: { "Accept": "application/json" },
              signal: AbortSignal.timeout(4000) // Timeout mais curto por liga
            }
          );
          
          if (!response.ok) return [];
          
          const data = await response.json();
          return (data.events || []).map((event: any) => ({
            id: event.id,
            name: event.name,
            shortName: event.shortName,
            league: {
              name: data.leagues?.[0]?.name || "",
              logo: data.leagues?.[0]?.logos?.[0]?.href
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
          // Falha silenciosa por liga para não quebrar a chamada inteira
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
      // Retorna objeto vazio em vez de lançar erro, evitando o 500
      return { events: [] };
    }
  });
