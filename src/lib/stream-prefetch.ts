/**
 * Prefetch leve do próximo canal.
 *
 * Objetivo: quando o cliente desce a lista, o canal seguinte já está com DNS,
 * TLS e manifesto resolvidos — a troca fica praticamente instantânea. Para não
 * gastar banda, buscamos SÓ o manifesto (alguns KB) e nunca os segmentos de
 * vídeo; cada canal é preparado uma única vez.
 */

import { warmEngines } from "../hooks/player-engines";
import { peekManifest, putChannelMeta, putManifest } from "./manifest-cache";
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
      .then((text) => putManifest(playable, text))
      .catch(() => undefined)
      .finally(() => {
        if (inflight === controller) inflight = null;
      });
  }, 600);
}

const focusInflight = new Map<string, AbortController>();

/** Primeira URI de mídia/variante listada em um manifesto HLS. */
function firstUri(text: string, base: string): string | null {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    try {
      return new URL(line, base).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Baixa só o começo do arquivo (o suficiente para a conexão ficar quente). */
async function warmBytes(url: string, signal: AbortSignal) {
  const res = await fetch(url, {
    signal,
    mode: "cors",
    credentials: "omit",
    headers: { Range: "bytes=0-131071" },
  });
  await res.body?.cancel().catch(() => undefined);
}

/**
 * Prefetch IMEDIATO do canal em foco (sem espera).
 *
 * Vai além do manifesto: resolve a variante e busca os primeiros bytes do
 * primeiro segmento. Quando a prévia monta o motor, playlist e início de vídeo
 * já estão em cache HTTP e a conexão está aberta — abre praticamente na hora.
 * Canais progressivos (.ts) recebem um Range curto com o mesmo efeito.
 */
export function prefetchChannelNow(url: string | null | undefined) {
  if (typeof window === "undefined" || !url) return;
  warmEngines(url);
  if (prepared.has(url)) return;
  const playable = playableStreamUrl(url);
  if (!playable) return;
  prepared.add(url);
  for (const [key, ctrl] of focusInflight) {
    if (key !== url) {
      ctrl.abort();
      focusInflight.delete(key);
    }
  }
  const controller = new AbortController();
  focusInflight.set(url, controller);
  const signal = controller.signal;

  const done = () => {
    if (focusInflight.get(url) === controller) focusInflight.delete(url);
  };

  if (!isManifest(playable)) {
    // Progressivo/TS: um Range curto abre DNS/TLS e já traz o início do vídeo.
    warmBytes(playable, signal).catch(() => undefined).finally(done);
    return;
  }

  (async () => {
    const text = await fetch(playable, { signal, mode: "cors", credentials: "omit" }).then((r) =>
      r.text(),
    );
    const first = firstUri(text, playable);
    if (!first) return;
    if (isManifest(first)) {
      // Master playlist: desce um nível e aquece o primeiro segmento da variante.
      const media = await fetch(first, { signal, mode: "cors", credentials: "omit" }).then((r) =>
        r.text(),
      );
      const seg = firstUri(media, first);
      if (seg) await warmBytes(seg, signal);
      return;
    }
    await warmBytes(first, signal);
  })()
    .catch(() => undefined)
    .finally(done);
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
