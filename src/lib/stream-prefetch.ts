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

  // Reduzi para 50ms para disparar quase na hora na navegação
  pending = setTimeout(() => {
    pending = null;
    if (prepared.has(url)) return;
    prepared.add(url);
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
  }, 50);
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
 * Cadeia de aquecimento de um canal: manifesto → variante → primeiros bytes do
 * primeiro segmento. Tudo o que é texto vai para o cache de manifesto, então a
 * prévia abre sem nenhuma ida ao servidor.
 */
async function warmChain(playable: string, signal: AbortSignal) {
  if (!isManifest(playable)) {
    putChannelMeta(playable, { kind: "progressive" });
    // Progressivo/TS: um Range curto abre DNS/TLS e já traz o início do vídeo.
    await warmBytes(playable, signal);
    return;
  }
  const text = await fetch(playable, { signal, mode: "cors", credentials: "omit" }).then((r) =>
    r.text(),
  );
  // Guarda ANTES de aquecer segmentos: se a prévia abrir agora, já usa o cache.
  putManifest(playable, text);
  putChannelMeta(playable, { kind: "hls" });
  const first = firstUri(text, playable);
  if (!first) return;
  if (isManifest(first)) {
    // Master playlist: desce um nível e aquece o primeiro segmento da variante.
    putChannelMeta(playable, { variant: first });
    const media = await fetch(first, { signal, mode: "cors", credentials: "omit" }).then((r) =>
      r.text(),
    );
    putManifest(first, media);
    const seg = firstUri(media, first);
    if (seg) await warmBytes(seg, signal);
    return;
  }
  await warmBytes(first, signal);
}

/**
 * Prefetch IMEDIATO do canal em foco (sem espera).
 *
 * Vai além do manifesto: resolve a variante e busca os primeiros bytes do
 * primeiro segmento. Quando a prévia monta o motor, playlist e início de vídeo
 * já estão em cache HTTP e a conexão está aberta — abre praticamente na hora.
 */
export function prefetchChannelNow(url: string | null | undefined) {
  if (typeof window === "undefined" || !url) return;
  warmEngines(url);
  const playable = playableStreamUrl(url);
  if (!playable) return;
  // Manifesto ainda fresco em memória: não há nada a buscar de novo.
  if (isManifest(playable)) {
    if (peekManifest(playable)) return;
  } else if (prepared.has(url)) {
    return;
  }
  prepared.add(url);
  for (const [key, ctrl] of focusInflight) {
    if (key !== url) {
      ctrl.abort();
      focusInflight.delete(key);
    }
  }
  const controller = new AbortController();
  focusInflight.set(url, controller);
  warmChain(playable, controller.signal)
    .catch(() => undefined)
    .finally(() => {
      if (focusInflight.get(url) === controller) focusInflight.delete(url);
    });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Vizinhos prováveis (histórico de navegação)
 *
 * A tela informa para onde o cliente está andando na lista (para baixo, para
 * cima ou parado). Preparamos os canais desse lado — manifesto E primeiros
 * bytes do primeiro segmento — depois de uma pequena pausa, para que apertar
 * ↓/↑ de novo abra a prévia sem espera. Se ele continuar andando, cancelamos.
 * ──────────────────────────────────────────────────────────────────────────── */
let neighborTimer: ReturnType<typeof setTimeout> | null = null;
let neighborCtrl: AbortController | null = null;

/** Prepara até 2 canais do lado em que o cliente está navegando. */
export function prefetchNeighbors(urls: Array<string | null | undefined>) {
  if (typeof window === "undefined") return;
  cancelNeighborPrefetch();
  const targets = urls.filter((u): u is string => Boolean(u)).slice(0, 2);
  if (!targets.length) return;

  neighborTimer = setTimeout(() => {
    neighborTimer = null;
    const controller = new AbortController();
    neighborCtrl = controller;
    void (async () => {
      // Em série: o canal em foco continua com prioridade de banda.
      for (const url of targets) {
        if (controller.signal.aborted) return;
        warmEngines(url);
        const playable = playableStreamUrl(url);
        if (!playable) continue;
        if (isManifest(playable) && peekManifest(playable)) continue;
        prepared.add(url);
        await warmChain(playable, controller.signal).catch(() => undefined);
      }
    })().finally(() => {
      if (neighborCtrl === controller) neighborCtrl = null;
    });
  }, 30);
}

export function cancelNeighborPrefetch() {
  if (neighborTimer) {
    clearTimeout(neighborTimer);
    neighborTimer = null;
  }
  neighborCtrl?.abort();
  neighborCtrl = null;
}

/** Cancela qualquer preparação pendente (saída da tela de canais). */
export function cancelChannelPrefetch() {
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  inflight?.abort();
  inflight = null;
  cancelNeighborPrefetch();
}
