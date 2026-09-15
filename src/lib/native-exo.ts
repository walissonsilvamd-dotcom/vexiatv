/**
 * Motor de vídeo nativo (ExoPlayer / Media3) — principal do app.
 *
 * Quando o app roda dentro de um APK Android/Android TV, a reprodução é
 * entregue ao ExoPlayer nativo: ele é mais leve, usa o decodificador de
 * hardware da TV e roda muito mais liso que qualquer player de navegador.
 * Fora do APK (PC, navegador de TV, preview) o app cai automaticamente no
 * player web interno (hls.js / mpegts.js / vídeo nativo).
 *
 * ── Contrato esperado do lado nativo ───────────────────────────────────────
 * O host Android deve expor UMA das duas interfaces abaixo:
 *
 * 1) WebView JavaScript interface, adicionada com
 *    `webView.addJavascriptInterface(bridge, "VexiaExo")`:
 *      VexiaExo.play(jsonPayload: string): boolean | void
 *      VexiaExo.stop(): void
 *      VexiaExo.isAvailable?(): boolean
 *
 * 2) Plugin Capacitor registrado como `ExoPlayer`:
 *      ExoPlayer.play({ ...payload }): Promise<void>
 *      ExoPlayer.stop(): Promise<void>
 *
 * Payload enviado (JSON):
 *   {
 *     url, title, subtitle?, live, startAtSeconds,
 *     userAgent?, referer?, subtitleUrl?, subtitleLanguage?
 *   }
 *
 * O host pode avisar o app de eventos chamando, no WebView:
 *   window.dispatchEvent(new CustomEvent("vexia:exo", { detail: { type: "ended" | "error" | "back" | "position", positionSeconds? } }))
 * ─────────────────────────────────────────────────────────────────────────── */

export type ExoPayload = {
  url: string;
  title: string;
  subtitle?: string;
  live: boolean;
  startAtSeconds?: number;
  userAgent?: string;
  referer?: string;
  subtitleUrl?: string;
  subtitleLanguage?: string;
};

export type ExoEvent =
  | { type: "ended"; positionSeconds?: number }
  | { type: "error"; message?: string }
  | { type: "back"; positionSeconds?: number }
  | { type: "position"; positionSeconds?: number };

type WebViewBridge = {
  play?: (payload: string) => unknown;
  stop?: () => unknown;
  isAvailable?: () => boolean;
};

type CapacitorBridge = {
  play?: (payload: ExoPayload) => Promise<unknown>;
  stop?: () => Promise<unknown>;
};

function webViewBridge(): WebViewBridge | null {
  if (typeof window === "undefined") return null;
  const candidates = ["VexiaExo", "ExoPlayerBridge", "AndroidExoPlayer"] as const;
  for (const name of candidates) {
    const bridge = (window as unknown as Record<string, WebViewBridge | undefined>)[name];
    if (bridge && typeof bridge.play === "function") {
      if (typeof bridge.isAvailable === "function" && !bridge.isAvailable()) continue;
      return bridge;
    }
  }
  return null;
}

function capacitorBridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  const plugins = (window as any)?.Capacitor?.Plugins;
  const plugin = plugins?.ExoPlayer as CapacitorBridge | undefined;
  return plugin && typeof plugin.play === "function" ? plugin : null;
}

/** true quando existe um ExoPlayer nativo pronto para receber o stream. */
export function exoAvailable(): boolean {
  return Boolean(webViewBridge() || capacitorBridge());
}

/** Nome amigável do motor em uso, para mostrar na interface. */
export function activeEngineLabel(usingExo: boolean): string {
  return usingExo ? "ExoPlayer (nativo)" : "Player web interno";
}

/**
 * Entrega o stream ao ExoPlayer nativo. Retorna false quando não há host
 * nativo ou a chamada falhou — nesse caso o app usa o player web.
 */
export async function exoPlay(payload: ExoPayload): Promise<boolean> {
  if (!payload.url) return false;
  const wv = webViewBridge();
  if (wv?.play) {
    try {
      const result = wv.play(JSON.stringify(payload));
      return result !== false;
    } catch {
      return false;
    }
  }
  const cap = capacitorBridge();
  if (cap?.play) {
    try {
      await cap.play(payload);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Encerra a reprodução nativa (ao sair do player ou trocar de conteúdo). */
export function exoStop(): void {
  try {
    webViewBridge()?.stop?.();
  } catch {
    /* host sem stop */
  }
  try {
    void capacitorBridge()?.stop?.();
  } catch {
    /* host sem stop */
  }
}

/** Escuta eventos enviados pelo host nativo. Retorna a função de limpeza. */
export function onExoEvent(handler: (event: ExoEvent) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as ExoEvent | undefined;
    if (detail?.type) handler(detail);
  };
  window.addEventListener("vexia:exo", listener as EventListener);
  return () => window.removeEventListener("vexia:exo", listener as EventListener);
}
