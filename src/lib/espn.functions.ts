import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
 * A ESPN fornece um endpoint que não requer chave de API para o dashboard.
 */
export const getLiveFootballScores = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const response = await fetch(
        "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard",
        { headers: { "Accept": "application/json" } }
      );
      
      if (!response.ok) return { events: [] };
      
      const data = await response.json();
      
      // Mapeia os eventos para o nosso formato simplificado
      const events: EspnGame[] = (data.events || []).map((event: any) => {
        return {
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
        };
      });

      return { events };
    } catch (error) {
      console.error("Erro ao buscar placares ESPN:", error);
      return { events: [] };
    }
  });
