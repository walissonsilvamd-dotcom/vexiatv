/**
 * Memória do último canal usado.
 *
 * Guarda qual canal estava selecionado na tela de Canais e se ele chegou a ser
 * aberto em tela cheia, para restaurar esse estado quando o usuário voltar.
 */
const KEY = "vexia:last-channel";

export type LastChannel = {
  id: string;
  /** true quando o canal foi aberto no player em tela cheia. */
  fullscreen: boolean;
  at: number;
};

export function readLastChannel(): LastChannel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastChannel>;
    if (!parsed || typeof parsed.id !== "string" || !parsed.id) return null;
    return { id: parsed.id, fullscreen: Boolean(parsed.fullscreen), at: Number(parsed.at) || 0 };
  } catch {
    return null;
  }
}

export function writeLastChannel(id: string, fullscreen: boolean) {
  if (typeof window === "undefined" || !id) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id, fullscreen, at: Date.now() }));
  } catch {
    /* armazenamento cheio ou bloqueado: a memória é opcional */
  }
}
