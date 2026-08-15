import { createServerFn } from "@tanstack/react-start";

/**
 * Interface simplificada para o retorno dos jogos da ESPN.
 */
export interface EspnGame {
  id: string;
  name: string;
  shortName: string;
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
 * Busca jogos de futebol na API pública da ESPN.
 */
export const getLiveFootballScores = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // Buscamos várias ligas para aumentar a chance de encontrar os jogos da lista
      const leagues = ["bra.1", "bra.2", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.champions", "uefa.europa", "conmebol.libertadores", "conmebol.sudamericana", "usa.1", "por.1", "arg.1"];
      
      const allEvents: EspnGame[] = [];
      
      const results = await Promise.allSettled(leagues.map(async (league) => {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`,
          { 
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(8000) 
          }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return (data.events || []).map((event: any) => ({
          id: event.id,
          name: event.name,
          shortName: event.shortName,
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
