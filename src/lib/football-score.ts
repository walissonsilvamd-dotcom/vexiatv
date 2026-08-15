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
};

// Regex para capturar padrões como "Time A 2 x 1 Time B" ou "Time A 2 - 1 Time B"
const SCORE_RE = /(.+?)\s+(\d+)\s*(?:x|-)\s*(\d+)\s+(.+)/i;
// Regex para capturar tempo de jogo (ex: "45'", "2º tempo", "Intervalo")
const TIME_RE = /(\d+'|\d{1,2}:\d{2}|intervalo|prorrogação|pênaltis)/i;

/**
 * Tenta extrair o placar e os times de uma string (geralmente o título do programa no EPG).
 */
export function extractFootballScore(text: string, description?: string): FootballScore | null {
  const match = text.match(SCORE_RE);
  if (!match) return null;

  const [, teamA, scoreA, scoreB, teamB] = match;
  
  // Tenta achar o tempo na descrição ou no título
  const timeMatch = (text + " " + (description || "")).match(TIME_RE);

  return {
    teamA: teamA.trim(),
    scoreA: parseInt(scoreA, 10),
    teamB: teamB.trim(),
    scoreB: parseInt(scoreB, 10),
    time: timeMatch ? timeMatch[0] : undefined,
    // Em uma implementação real, poderíamos mapear os nomes dos times para URLs de logos conhecidas
    // Por enquanto usamos fallbacks visuais no componente
    logoA: getTeamLogoUrl(teamA.trim()),
    logoB: getTeamLogoUrl(teamB.trim()),
  };
}

function getTeamLogoUrl(teamName: string): string | undefined {
  // Mapeamento simples ou serviço externo
  // Exemplo: usar Clearbit ou similar para marcas, mas para times de futebol 
  // o ideal seria uma base local ou API de esportes.
  // Por enquanto retornamos undefined para usar o fallback de ícone.
  return undefined; 
}
