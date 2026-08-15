/**
 * Tipos compartilhados dos dados de futebol vindos da ESPN.
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
