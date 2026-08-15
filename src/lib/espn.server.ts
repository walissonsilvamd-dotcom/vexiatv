import type { EspnGame } from "./espn-types";

/** Ligas de futebol acompanhadas (IDs da ESPN). */
export const FOOTBALL_LEAGUES = [
  "bra.1", "bra.2", "bra.cup", "bra.nordeste",
  "eng.1", "eng.2", "eng.fa", "eng.carabao",
  "esp.1", "esp.2", "esp.cup",
  "ita.1", "ita.2", "ita.cup",
  "ger.1", "ger.2",
  "fra.1", "fra.2", "fra.cup",
  "por.1", "por.2",
  "ned.1", "ksa.1",
  "arg.1", "mex.1",
  "uefa.champions", "uefa.europa", "uefa.europa.conf",
  "conmebol.libertadores", "conmebol.sudamericana",
  "fifa.world", "conmebol.america", "fifa.friendly",
];

function mapEvent(event: any, leagueName: string, leagueLogo?: string): EspnGame {
  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName,
    league: { name: leagueName, logo: leagueLogo },
    date: event.date,
    status: {
      type: {
        name: event.status?.type?.name ?? "",
        description: event.status?.type?.description ?? "",
        state: event.status?.type?.state ?? "pre",
      },
      displayClock: event.status?.displayClock ?? "",
      period: event.status?.period ?? 0,
    },
    competitors: (event.competitions?.[0]?.competitors ?? []).map((c: any) => ({
      id: c.id,
      team: {
        id: c.team?.id ?? "",
        location: c.team?.location ?? "",
        name: c.team?.name ?? "",
        abbreviation: c.team?.abbreviation ?? "",
        displayName: c.team?.displayName ?? "",
        logo: c.team?.logo ?? "",
      },
      score: c.score ?? "0",
      homeAway: c.homeAway,
    })),
    broadcasts: (event.competitions?.[0]?.broadcasts ?? []).map((b: any) => ({
      market: b.market,
      names: b.names ?? [],
    })),
  };
}

/** Busca os jogos de futebol de uma data (YYYYMMDD) em todas as ligas acompanhadas. */
export async function fetchFootballScores(dateParam: string): Promise<{ events: EspnGame[] }> {
  const results = await Promise.allSettled(
    FOOTBALL_LEAGUES.map(async (league) => {
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${dateParam}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) },
      );
      if (!response.ok) return [] as EspnGame[];
      const json: any = await response.json();
      const leagueName = json.leagues?.[0]?.name || "";
      const leagueLogo = json.leagues?.[0]?.logos?.[0]?.href;
      return (json.events || []).map((e: any) => mapEvent(e, leagueName, leagueLogo));
    }),
  );

  const events: EspnGame[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) events.push(...r.value);
  }
  return { events };
}

/** Detalhes de um jogo (escalações, lances). */
export async function fetchGameDetails(id: string) {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
