/**
 * Formato preferido dos canais ao vivo (.ts ou .m3u8).
 *
 * Painéis Xtream entregam o mesmo canal nos dois formatos, mas cada servidor
 * roda liso em um deles. O app lembra qual formato funcionou por último e passa
 * a tentar esse PRIMEIRO — assim a troca de canal não perde tempo tentando o
 * formato que aquele servidor entrega quebrado.
 */

export type LiveFormat = "ts" | "m3u8";

const KEY = "vexia.live-format";
/** Padrão: .ts (mais leve para abrir e o que a maioria dos painéis prioriza). */
const DEFAULT: LiveFormat = "ts";

let cached: LiveFormat | null = null;

/** Extrai o formato de uma URL de canal ao vivo (null quando não se aplica). */
export function formatOf(url: string): LiveFormat | null {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".m3u8")) return "m3u8";
  if (path.endsWith(".ts")) return "ts";
  return null;
}

export function preferredLiveFormat(): LiveFormat {
  if (cached) return cached;
  if (typeof window === "undefined") return DEFAULT;
  const stored = window.localStorage.getItem(KEY);
  cached = stored === "ts" || stored === "m3u8" ? stored : DEFAULT;
  return cached;
}

/** Grava o formato que realmente entrou no ar. */
export function rememberLiveFormat(url: string): void {
  const format = formatOf(url);
  if (!format || format === cached) return;
  cached = format;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, format);
  } catch {
    /* armazenamento indisponível: fica só em memória */
  }
}
