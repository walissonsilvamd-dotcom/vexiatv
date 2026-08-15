/**
 * Lógica para extração de placar e times de futebol de títulos e descrições do EPG.
 */

export type FootballScore = {
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  time?: string;
  logoA?: string;
  logoB?: string;
  isLive: boolean;
};

// Regex para capturar padrões como "Time A 2 x 1 Time B" ou "Time A 2 - 1 Time B"
const SCORE_RE = /(.+?)\s+(\d+)\s*(?:x|-)\s*(\d+)\s+(.+)/i;
// Regex para capturar tempo de jogo (ex: "45'", "2º tempo", "Intervalo")
const TIME_RE = /(\d+'|\d{1,2}:\d{2}|intervalo|prorrogação|pênaltis|encerrado|fim)/i;

/**
 * Tenta extrair o placar e os times de uma string (geralmente o título do programa no EPG).
 */
export function extractFootballScore(text: string, description?: string): FootballScore | null {
  const match = text.match(SCORE_RE);
  if (!match) return null;

  const [, teamA, scoreA, scoreB, teamB] = match;
  
  const fullText = (text + " " + (description || "")).toLowerCase();
  const timeMatch = fullText.match(TIME_RE);
  
  const isFinished = fullText.includes("encerrado") || fullText.includes("fim de jogo") || fullText.includes("finalizado");

  return {
    teamA: teamA.trim(),
    scoreA: parseInt(scoreA, 10),
    teamB: teamB.trim(),
    scoreB: parseInt(scoreB, 10),
    time: timeMatch ? timeMatch[0] : undefined,
    isLive: !isFinished,
    logoA: getTeamLogoUrl(teamA.trim()),
    logoB: getTeamLogoUrl(teamB.trim()),
  };
}

function getTeamLogoUrl(teamName: string): string | undefined {
  // Implementação futura para logos reais
  return undefined; 
}
