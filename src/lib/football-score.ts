/**
 * Lógica para extração de placar e times de futebol de títulos e descrições do EPG.
 */

export type FootballScore = {
  id?: string;
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  time?: string;
  logoA?: string;
  logoB?: string;
  isLive: boolean;
  broadcastChannels?: string[];
};

// Regex para capturar padrões como "Time A 2 x 1 Time B" ou "Time A 2 - 1 Time B"
const SCORE_RE = /(.+?)\s+(\d+)\s*(?:x|-)\s*(\d+)\s+(.+)/i;
// Regex para capturar times em jogos futuros como "Time A vs Time B" ou "Time A x Time B"
const VERSUS_RE = /(.+?)\s+(?:vs|x)\s+(.+)/i;
// Regex para capturar tempo de jogo (ex: "45'", "2º tempo", "Intervalo")
const TIME_RE = /(\d+'|\d{1,2}:\d{2}|intervalo|prorrogação|pênaltis|encerrado|fim)/i;

/**
 * Tenta extrair o placar e os times de uma string (geralmente o título do programa no EPG).
 */
export function extractFootballScore(text: string, description?: string): FootballScore | null {
  const fullText = (text + " " + (description || "")).toLowerCase();
  const isFinished = fullText.includes("encerrado") || fullText.includes("fim de jogo") || fullText.includes("finalizado");
  const timeMatch = fullText.match(TIME_RE);

  // 1. Tenta extrair placar (Live)
  const scoreMatch = text.match(SCORE_RE);
  if (scoreMatch) {
    const [, teamA, scoreA, scoreB, teamB] = scoreMatch;
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

  // 2. Tenta extrair confronto futuro (vs/x)
  const vsMatch = text.match(VERSUS_RE);
  if (vsMatch) {
    const [, teamA, teamB] = vsMatch;
    
    // Se um dos times for um horário (ex: "18:30"), ignoramos esse match
    if (/^\d{1,2}:\d{2}$/.test(teamA.trim()) || /^\d{1,2}:\d{2}$/.test(teamB.trim())) {
      return null;
    }

    return {
      teamA: teamA.trim(),
      scoreA: 0,
      teamB: teamB.trim(),
      scoreB: 0,
      time: undefined,
      isLive: false,
      logoA: getTeamLogoUrl(teamA.trim()),
      logoB: getTeamLogoUrl(teamB.trim()),
    };
  }

  return null;
}

function getTeamLogoUrl(teamName: string): string | undefined {
  const normalized = teamName.toLowerCase();
  
  // Mapeamento básico de times brasileiros comuns para logos da Wikipedia/Wikimedia
  // Isso garante que os escudos apareçam mesmo sem uma API de esportes dedicada
  const mapping: Record<string, string> = {
    "santos": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Santos_logo.svg/100px-Santos_logo.svg.png",
    "chapecoense": "https://upload.wikimedia.org/wikipedia/pt/thumb/a/ad/Chapecoense_2016.png/100px-Chapecoense_2016.png",
    "internacional": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Escudo_do_Sport_Club_Internacional.svg/100px-Escudo_do_Sport_Club_Internacional.svg.png",
    "cruzeiro": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Cruzeiro_Esporte_Clube_%28logo%29.svg/100px-Cruzeiro_Esporte_Clube_%28logo%29.svg.png",
    "botafogo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Botafogo_de_Futebol_e_Regatas_logo.svg/100px-Botafogo_de_Futebol_e_Regatas_logo.svg.png",
    "bahia": "https://upload.wikimedia.org/wikipedia/pt/thumb/e/e1/Esporte_Clube_Bahia_logo.svg/100px-Esporte_Clube_Bahia_logo.svg.png",
    "corinthians": "https://upload.wikimedia.org/wikipedia/pt/thumb/1/10/Sport_Club_Corinthians_Paulista_logo.svg/100px-Sport_Club_Corinthians_Paulista_logo.svg.png",
    "flamengo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Flamengo_brazilian_polysemic_logo.svg/100px-Flamengo_brazilian_polysemic_logo.svg.png",
    "são paulo": "https://upload.wikimedia.org/wikipedia/pt/thumb/4/4b/Sao_Paulo_Futebol_Clube.svg/100px-Sao_Paulo_Futebol_Clube.svg.png",
    "spfc": "https://upload.wikimedia.org/wikipedia/pt/thumb/4/4b/Sao_Paulo_Futebol_Clube.svg/100px-Sao_Paulo_Futebol_Clube.svg.png",
    "palmeiras": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Palmeiras_logo.svg/100px-Palmeiras_logo.svg.png",
    "grêmio": "https://upload.wikimedia.org/wikipedia/pt/thumb/1/17/Gremio_logo.svg/100px-Gremio_logo.svg.png",
    "fluminense": "https://upload.wikimedia.org/wikipedia/pt/thumb/a/a3/Fluminense_FC_escudo.png/100px-Fluminense_FC_escudo.png",
    "vasco": "https://upload.wikimedia.org/wikipedia/pt/thumb/a/ac/CRVascodaGama.svg/100px-CRVascodaGama.svg.png",
    "atlético-mg": "https://upload.wikimedia.org/wikipedia/pt/thumb/5/5f/Atletico_mineiro_galo.png/100px-Atletico_mineiro_galo.png",
    "atletico mg": "https://upload.wikimedia.org/wikipedia/pt/thumb/5/5f/Atletico_mineiro_galo.png/100px-Atletico_mineiro_galo.png",
    "bragantino": "https://upload.wikimedia.org/wikipedia/pt/thumb/9/9e/Red_Bull_Bragantino_logo.svg/100px-Red_Bull_Bragantino_logo.svg.png",
    "coritiba": "https://upload.wikimedia.org/wikipedia/pt/thumb/a/a3/Coritiba_FBC_%282023%29.png/100px-Coritiba_FBC_%282023%29.png",
    "vitória": "https://upload.wikimedia.org/wikipedia/pt/thumb/f/f7/Esporte_Clube_Vit%C3%B3ria_logo.svg/100px-Esporte_Clube_Vit%C3%B3ria_logo.svg.png",
    "remo": "https://upload.wikimedia.org/wikipedia/pt/thumb/5/56/Clube_do_Remo.png/100px-Clube_do_Remo.png"
  };

  for (const [key, url] of Object.entries(mapping)) {
    if (normalized.includes(key)) return url;
  }

  return undefined;
}
