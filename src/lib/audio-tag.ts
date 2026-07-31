/**
 * Detecta se um título da lista M3U/Xtream é DUBLADO ou LEGENDADO.
 * As listas marcam isso de várias formas: "[L]", "[D]", "(DUB)", "LEGENDADO",
 * "DUAL AUDIO", etc. Aqui normalizamos tudo em um selo curto (DUBL / LEG).
 */
export type AudioTag = "DUBL" | "LEG" | "DUAL";

const DUAL = /\b(dual\s*[- ]?\s*(audio|áudio)|multi\s*audio)\b/i;
const DUB = /(\[\s*d\s*\]|\(\s*d\s*\)|\bdubl?(ado|ada|agem)?\b|\bdubbed\b|\bdual\b)/i;
const LEG = /(\[\s*l\s*\]|\(\s*l\s*\)|\[\s*s(ub)?\s*\]|\bleg(endado|endada|endas)?\b|\bsubbed\b|\bsubtitled\b|\bvose\b)/i;

/** Retorna o selo de áudio a partir de um ou mais textos (título, grupo, categoria). */
export function detectAudioTag(...sources: (string | undefined | null)[]): AudioTag | null {
  const text = sources.filter(Boolean).join(" ");
  if (!text) return null;
  if (DUAL.test(text)) return "DUAL";
  const dub = DUB.test(text);
  const leg = LEG.test(text);
  if (dub && leg) return "DUAL";
  if (dub) return "DUBL";
  if (leg) return "LEG";
  return null;
}

export const AUDIO_TAG_LABEL: Record<AudioTag, string> = {
  DUBL: "Dublado",
  LEG: "Legendado",
  DUAL: "Dublado e legendado",
};
