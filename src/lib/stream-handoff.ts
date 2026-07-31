/**
 * Entrega rápida do link de reprodução ("handoff").
 *
 * Ao clicar num episódio/filme/canal, a tela de origem JÁ conhece o link do
 * stream. Sem isso, o player precisaria esperar a lista de episódios ser
 * baixada de novo antes de começar a tocar — o que atrasava o início em
 * vários segundos.
 *
 * Aqui guardamos o link (memória + sessionStorage) e o player o lê de forma
 * síncrona, começando a reprodução no mesmo instante do clique.
 */

export type HandoffKind = "live" | "movie" | "series";

type Handoff = { url: string; at: number };

const KEY = "vexia:handoff";
/** Um handoff só vale para a navegação imediata (5 min é folga suficiente). */
const TTL_MS = 5 * 60_000;

const memory = new Map<string, Handoff>();

function keyFor(type: HandoffKind, id: string, ep?: string) {
  return `${type}::${id}::${ep ?? ""}`;
}

function readStore(): Record<string, Handoff> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Record<string, Handoff>;
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, Handoff>) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* armazenamento cheio: a memória já cobre a navegação atual */
  }
}

/** Guarda o link antes de navegar para o player. */
export function setStreamHandoff(
  type: HandoffKind,
  id: string,
  url: string | undefined | null,
  ep?: string,
): void {
  if (!url) return;
  const entry: Handoff = { url, at: Date.now() };
  const key = keyFor(type, id, ep);
  memory.set(key, entry);
  const store = readStore();
  // Mantém o arquivo pequeno: só as últimas 20 entregas.
  const fresh = Object.entries(store)
    .filter(([, value]) => Date.now() - value.at < TTL_MS)
    .slice(-19);
  writeStore({ ...Object.fromEntries(fresh), [key]: entry });
}

/** Recupera o link entregue pela tela anterior (ou undefined). */
export function getStreamHandoff(type: HandoffKind, id: string, ep?: string): string | undefined {
  const key = keyFor(type, id, ep);
  const entry = memory.get(key) ?? readStore()[key];
  if (!entry) return undefined;
  if (Date.now() - entry.at > TTL_MS) return undefined;
  memory.set(key, entry);
  return entry.url;
}
