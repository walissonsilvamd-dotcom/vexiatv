/**
 * Prefetch leve do próximo canal.
 *
 * Objetivo: quando o cliente desce a lista, o canal seguinte já está com DNS,
 * TLS e manifesto resolvidos — a troca fica praticamente instantânea. Para não
 * gastar banda, buscamos SÓ o manifesto (alguns KB) e nunca os segmentos de
 * vídeo; cada canal é preparado uma única vez.
 */

import { warmEngines } from "../hooks/player-engines";
import { playableStreamUrl } from "./stream-url";

const prepared = new Set<string>();
let pending: ReturnType<typeof setTimeout> | null = null;
let inflight: AbortController | null = null;

/** Só faz sentido pré-carregar manifesto de HLS; TS/progressivo baixaria vídeo. */
function isManifest(url: string) {
  const path = url.split("?")[0].toLowerCase();
  return path.endsWith(".m3u8") || path.endsWith(".m3u");
}

/**
 * Prepara o canal indicado. Espera 600 ms antes de agir: se o cliente continuar
 * navegando, nada é baixado para o canal que ele apenas passou por cima.
 */
export function prefetchChannel(url: string | null | undefined) {
  if (typeof window === "undefined" || !url) return;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  inflight?.abort();
  inflight = null;
  if (prepared.has(url)) return;

  pending = setTimeout(() => {
    pending = null;
    if (prepared.has(url)) return;
    prepared.add(url);
    // Conexão aquecida (preconnect/dns-prefetch) para qualquer tipo de stream.
    warmEngines(url);
    const playable = playableStreamUrl(url);
    if (!playable || !isManifest(playable)) return;
    const controller = new AbortController();
    inflight = controller;
    fetch(playable, { signal: controller.signal, mode: "cors", credentials: "omit" })
      .then((r) => r.text())
      .catch(() => undefined)
      .finally(() => {
        if (inflight === controller) inflight = null;
      });
  }, 600);
}

/** Cancela qualquer preparação pendente (saída da tela de canais). */
export function cancelChannelPrefetch() {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  inflight?.abort();
  inflight = null;
}
