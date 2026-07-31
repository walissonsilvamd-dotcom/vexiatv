/**
 * Escolha da melhor faixa de legenda disponível.
 *
 * Quando o idioma pedido não existe na lista carregada, cai para a melhor
 * alternativa possível em vez de simplesmente pegar a primeira faixa.
 */
export type SubtitleCandidate = { id: number; label: string; lang: string };

/** pt-br → ["pt-br", "pt"]; também aceita rótulos como "Português". */
function normalize(value: string) {
  return value.trim().toLowerCase();
}

const LABEL_HINTS: Record<string, string[]> = {
  pt: ["portug", "brasil", "brazil", "pt-br", "pt_br"],
  en: ["ingl", "english", "eng"],
  es: ["espan", "españ", "spanish", "spa", "latino", "castel"],
  fr: ["franc", "french"],
  it: ["ital"],
  de: ["alem", "german", "deutsch"],
};

/** Pontua o quanto uma faixa combina com o idioma desejado (0 = não combina). */
function score(track: SubtitleCandidate, wanted: string) {
  const w = normalize(wanted);
  const base = w.split(/[-_]/)[0];
  const lang = normalize(track.lang || "");
  const label = normalize(track.label || "");

  if (lang && lang === w) return 100; // pt-br === pt-br
  if (lang && lang.split(/[-_]/)[0] === base) return lang === base ? 90 : 80; // pt / pt-pt
  if (label && label === w) return 70;
  const hints = LABEL_HINTS[base] ?? [];
  if (label && hints.some((h) => label.includes(h))) return 60;
  if (label && label.includes(base)) return 40;
  return 0;
}

/**
 * Retorna a faixa mais adequada seguindo a ordem de preferências informada.
 * Se nenhuma preferência combinar, tenta inglês e, por fim, a primeira faixa.
 */
export function pickSubtitleTrack(
  tracks: SubtitleCandidate[],
  preferences: (string | null | undefined)[],
): SubtitleCandidate | null {
  if (tracks.length === 0) return null;

  for (const pref of preferences) {
    if (!pref || pref === "off") continue;
    let best: SubtitleCandidate | null = null;
    let bestScore = 0;
    for (const track of tracks) {
      const s = score(track, pref);
      if (s > bestScore) {
        best = track;
        bestScore = s;
      }
    }
    if (best) return best;
  }

  // Fallback final: inglês costuma ser o denominador comum; senão, a primeira.
  const english = tracks.find((t) => score(t, "en") > 0);
  return english ?? tracks[0];
}
