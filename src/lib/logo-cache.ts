// src/lib/logo-cache.ts
import { searchTeamLogo } from "./team-logos.functions";

// Cache em memória para logos de times
const logoCache = new Map<string, string | null>();
// Promessas pendentes para evitar múltiplas chamadas simultâneas ao mesmo time
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Busca o logo de um time com cache em memória e tratamento de requisições duplicadas.
 */
export async function getCachedTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName) return null;

  // 1. Verificar cache
  if (logoCache.has(teamName)) {
    return logoCache.get(teamName) || null;
  }

  // 2. Verificar se já existe uma requisição em andamento
  if (pendingRequests.has(teamName)) {
    return pendingRequests.get(teamName)!;
  }

  // 3. Criar nova requisição
  const request = (async () => {
    try {
      const logo = await searchTeamLogo({ data: { teamName } });
      logoCache.set(teamName, logo);
      return logo;
    } catch (error) {
      console.error(`Erro ao buscar logo (cached) para ${teamName}:`, error);
      return null;
    } finally {
      pendingRequests.delete(teamName);
    }
  })();

  pendingRequests.set(teamName, request);
  return request;
}

/**
 * Pré-carrega logos para uma lista de nomes de times.
 */
export function prefetchTeamLogos(teamNames: string[]) {
  teamNames.forEach(name => {
    if (name && !logoCache.has(name) && !pendingRequests.has(name)) {
      getCachedTeamLogo(name);
    }
  });
}
