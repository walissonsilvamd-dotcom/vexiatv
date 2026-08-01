/**
 * Modos de imagem do player (como no APK base): ajustar, preencher, esticar
 * e zoom. Guardado no aparelho para valer também no próximo conteúdo.
 */
export type FitMode = "contain" | "cover" | "fill" | "zoom110" | "zoom125";

export const FIT_MODES: { id: FitMode; label: string }[] = [
  { id: "contain", label: "Ajustar" },
  { id: "cover", label: "Preencher" },
  { id: "fill", label: "Esticar" },
  { id: "zoom110", label: "Zoom 110%" },
  { id: "zoom125", label: "Zoom 125%" },
];

const KEY = "vexia.player.fit";

export function fitLabel(mode: FitMode) {
  return FIT_MODES.find((m) => m.id === mode)?.label ?? "Ajustar";
}

export function readFitMode(): FitMode {
  if (typeof localStorage === "undefined") return "contain";
  const raw = localStorage.getItem(KEY);
  return FIT_MODES.some((m) => m.id === raw) ? (raw as FitMode) : "contain";
}

export function saveFitMode(mode: FitMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* armazenamento cheio/bloqueado: modo continua válido nesta sessão */
  }
}

/** Estilo inline aplicado às duas superfícies de vídeo (ativa + reserva). */
export function fitStyle(mode: FitMode): React.CSSProperties {
  switch (mode) {
    case "cover":
      return { objectFit: "cover" };
    case "fill":
      return { objectFit: "fill" };
    case "zoom110":
      return { objectFit: "contain", transform: "scale(1.1)" };
    case "zoom125":
      return { objectFit: "contain", transform: "scale(1.25)" };
    default:
      return { objectFit: "contain" };
  }
}
