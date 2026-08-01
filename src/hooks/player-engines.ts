import { readSettings } from "../lib/settings-store";
import { formatOf, preferredLiveFormat } from "../lib/live-format";
import type { HlsLike } from "./useMediaTracks";

export type PlaybackEngine = "hls.js" | "mpegts.js" | "native";

export type EngineHandles = {
  destroy: () => void;
  hlsApi: HlsLike | null;
};

export type AttachOptions = {
  src: string;
  live: boolean;
  /** Falha considerada irrecuperável para este motor. */
  onFatal: (reason: string) => void;
  /** Tentativa de recuperação local antes de trocar de motor. */
  onRecoverable?: (reason: string, recover: () => void) => void;
  /** Chamado quando o motor está pronto para iniciar a reprodução. */
  onReadyToPlay: () => void;
  /**
   * Modo prévia: qualidade/bitrate reduzidos de propósito. Começa na faixa
   * mais leve da lista (máx. 480p) e usa buffers curtos, então o canal abre
   * muito mais rápido e gasta pouca banda — sem perder usabilidade.
   */
  preview?: boolean;
};

export function sourceKind(src: string) {
  const pathname = (() => {
    try {
      return new URL(src, window.location.href).pathname.toLowerCase();
    } catch {
      return src.toLowerCase().split("?")[0];
    }
  })();
  if (pathname.endsWith(".m3u8") || pathname.endsWith(".m3u")) return "hls";
  if (pathname.endsWith(".ts") || pathname.endsWith(".m2ts")) return "mpegts";
  return "progressive";
}

export function engineOrder(src: string): PlaybackEngine[] {
  const kind = sourceKind(src);
  if (kind === "hls") return ["hls.js", "native", "mpegts.js"];
  if (kind === "mpegts") return ["mpegts.js", "native", "hls.js"];
  return ["native", "mpegts.js", "hls.js"];
}

/* ────────────────────────────────────────────────────────────────────────────
 * Formato do stream ao vivo (TS ⇄ HLS)
 *
 * Painéis Xtream entregam o MESMO canal em dois formatos:
 *   .../live/usuario/senha/12345.ts     (MPEG-TS)
 *   .../live/usuario/senha/12345.m3u8   (HLS)
 * Em muitos servidores um dos dois falha (ou trava) enquanto o outro roda liso.
 * Por isso a cadeia de recuperação não troca apenas de MOTOR: quando os motores
 * do formato atual se esgotam, o app tenta o mesmo canal no outro formato.
 * ──────────────────────────────────────────────────────────────────────────── */

export type PlaybackCandidate = { src: string; engine: PlaybackEngine };

const PROXY_PREFIX = "/api/public/stream?url=";
const LIVE_PATH = /(\/live\/[^/]+\/[^/]+\/\d+)\.(ts|m3u8)(\?.*)?$/i;

/** Aplica uma transformação na URL real, mesmo quando ela passa pelo proxy. */
function mapRealUrl(src: string, map: (real: string) => string | null): string | null {
  if (src.startsWith(PROXY_PREFIX)) {
    const inner = decodeURIComponent(src.slice(PROXY_PREFIX.length));
    const mapped = map(inner);
    return mapped ? `${PROXY_PREFIX}${encodeURIComponent(mapped)}` : null;
  }
  return map(src);
}

/** Mesmo canal no formato alternativo (.ts ⇄ .m3u8), ou null quando não se aplica. */
export function alternateFormat(src: string): string | null {
  return mapRealUrl(src, (real) => {
    const match = real.match(LIVE_PATH);
    if (!match) return null;
    const [, path, ext, query = ""] = match;
    const other = ext.toLowerCase() === "ts" ? "m3u8" : "ts";
    return `${real.slice(0, real.indexOf(match[0]))}${path}.${other}${query}`;
  });
}


/**
 * Cadeia completa de tentativas: todos os motores do formato atual e, em
 * seguida, os do formato alternativo. É isso que garante canal no ar mesmo
 * quando o servidor entrega um dos formatos quebrado.
 *
 * Ao vivo, o formato que funcionou por último (memorizado) vai na frente: o
 * zapping não gasta tempo tentando o container que aquele painel entrega ruim.
 */
export function candidateOrder(src: string): PlaybackCandidate[] {
  const primary = engineOrder(src).map((engine) => ({ src, engine }));
  const other = alternateFormat(src);
  if (!other) return primary;
  const fallback = engineOrder(other)
    .slice(0, 2)
    .map((engine) => ({ src: other, engine }));
  const current = formatOf(src);
  // Servidor já provou preferir o outro container: começa por ele.
  if (current && preferredLiveFormat() !== current) {
    return [...engineOrder(other).map((engine) => ({ src: other, engine })), ...primary];
  }
  return [...primary, ...fallback];
}



/**
 * Pré-carrega o motor de reprodução (e abre a conexão com o servidor de
 * stream) ANTES do clique. Assim, ao escolher o episódio, não há espera para
 * baixar a biblioteca nem para resolver DNS/TLS: o vídeo começa na hora.
 */
let warmed = false;
export function warmEngines(src?: string | null): void {
  if (typeof window === "undefined") return;
  if (!warmed) {
    warmed = true;
    void import("hls.js").catch(() => undefined);
  }
  if (!src) return;
  try {
    const origin = new URL(src, window.location.href).origin;
    if (document.querySelector(`link[data-vexia-warm="${origin}"]`)) return;
    for (const rel of ["preconnect", "dns-prefetch"]) {
      const link = document.createElement("link");
      link.rel = rel;
      link.href = origin;
      link.crossOrigin = "anonymous";
      link.dataset.vexiaWarm = origin;
      document.head.appendChild(link);
    }
  } catch {
    /* URL relativa/inválida: nada a aquecer */
  }
}

export async function playWithAutoplayFallback(video: HTMLVideoElement) {
  try {
    await video.play();
    return false;
  } catch {
    video.muted = true;
    await video.play();
    return true;
  }
}

/** Liga um motor de reprodução a um elemento <video>. Nunca lança. */
/** Altura máxima permitida pela preferência de Qualidade (null = automático). */
function qualityCap(preview = false): number | null {
  const quality = readSettings().quality;
  const cap =
    quality === "low" ? 480 : quality === "medium" ? 720 : quality === "high" ? 1080 : null;
  // Na prévia nunca passamos de 480p, mesmo que o cliente escolha "original".
  if (preview) return Math.min(cap ?? 480, 480);
  return cap; // auto e original usam tudo o que a lista oferecer
}

/* ────────────────────────────────────────────────────────────────────────────
 * Perfil de desempenho (Ajustes → Reprodução)
 *
 * Smart TV barata engasga com buffer grande e ABR agressiva; internet boa
 * aproveita o contrário. O perfil ajusta buffer, estimativa inicial de banda e
 * o quanto a ABR pode subir de faixa.
 * ──────────────────────────────────────────────────────────────────────────── */
type Tuning = {
  bufferScale: number;
  bandwidthEstimate: number;
  capToPlayerSize: boolean;
  stashScale: number;
};

function tuningFor(preview: boolean): Tuning {
  if (preview) {
    return { bufferScale: 1, bandwidthEstimate: 800_000, capToPlayerSize: true, stashScale: 1 };
  }
  switch (readSettings().perfProfile) {
    case "eco":
      // Aparelho fraco: buffer curto (menos RAM/decoder) e faixa contida.
      return { bufferScale: 0.6, bandwidthEstimate: 2_000_000, capToPlayerSize: true, stashScale: 0.5 };
    case "smooth":
      // Internet boa: buffer generoso, quase nunca rebuffera.
      return { bufferScale: 1.8, bandwidthEstimate: 12_000_000, capToPlayerSize: false, stashScale: 2 };
    default:
      return { bufferScale: 1, bandwidthEstimate: 8_000_000, capToPlayerSize: false, stashScale: 1 };
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Pré-carregamento de manifesto (zapping instantâneo)
 *
 * Ao abrir um canal, os vizinhos da lista têm o manifesto/primeiros bytes
 * buscados em segundo plano. Quando o cliente aperta Canal +/−, o servidor já
 * respondeu uma vez e a conexão está quente: a troca fica quase imediata.
 * ──────────────────────────────────────────────────────────────────────────── */
const prefetched = new Set<string>();

export function prefetchStream(src?: string | null): void {
  if (typeof window === "undefined" || !src) return;
  if (prefetched.has(src)) return;
  prefetched.add(src);
  if (prefetched.size > 60) prefetched.clear();
  warmEngines(src);
  const controller = new AbortController();
  const stop = window.setTimeout(() => controller.abort(), 2_500);
  void fetch(src, {
    method: "GET",
    signal: controller.signal,
    headers: sourceKind(src) === "hls" ? {} : { Range: "bytes=0-65535" },
  })
    .then((response) => response.body?.cancel().catch(() => undefined))
    .catch(() => undefined)
    .finally(() => window.clearTimeout(stop));
}


export async function attachEngine(
  video: HTMLVideoElement,
  engine: PlaybackEngine,
  options: AttachOptions,
): Promise<EngineHandles> {
  const { src, live, onFatal, onRecoverable, onReadyToPlay, preview = false } = options;
  const fail = (reason: string, recover?: () => void) => {
    if (recover && onRecoverable) onRecoverable(reason, recover);
    else onFatal(reason);
  };

  if (engine === "native") {
    const onError = () =>
      fail(video.error?.message || "native-error", () => {
        video.load();
        onReadyToPlay();
      });
    const onCanPlay = () => onReadyToPlay();
    video.addEventListener("error", onError);
    video.addEventListener("canplay", onCanPlay);
    video.src = src;
    video.load();
    return {
      hlsApi: null,
      destroy: () => {
        video.removeEventListener("error", onError);
        video.removeEventListener("canplay", onCanPlay);
      },
    };
  }

  if (engine === "hls.js") {
    const { default: Hls } = await import("hls.js");
    if (!Hls.isSupported()) {
      onFatal("hls-not-supported");
      return { hlsApi: null, destroy: () => undefined };
    }
    const maxHeight = qualityCap(preview);
    const instance = new Hls({
      lowLatencyMode: live && !preview,
      enableWorker: true,
      startFragPrefetch: true,
      testBandwidth: false,
      // Fora da prévia buscamos SEMPRE a melhor faixa que a banda aguenta:
      // não limitamos pelo tamanho do elemento e já estimamos banda alta, então
      // o filme abre na melhor imagem e a ABR só desce se realmente precisar.
      capLevelToPlayerSize: preview,
      abrEwmaDefaultEstimate: preview ? 800_000 : 8_000_000,
      // Prévia: entra pela faixa mais leve (imagem aparece quase instantânea).
      startLevel: preview ? 0 : -1,
      // Começa a tocar com o mínimo de dados possível.
      maxStarvationDelay: 2,
      maxLoadingDelay: 2,
      backBufferLength: preview ? 6 : live ? 20 : 90,
      maxBufferLength: preview ? 6 : live ? 30 : 60,
      maxMaxBufferLength: preview ? 12 : live ? 60 : 120,
      maxBufferHole: 0.5,
      highBufferWatchdogPeriod: 1,
      nudgeOffset: 0.1,
      nudgeMaxRetry: 2,
      manifestLoadingTimeOut: 6_000,
      manifestLoadingMaxRetry: 2,
      levelLoadingTimeOut: 8_000,
      levelLoadingMaxRetry: 2,
      fragLoadingTimeOut: 10_000,
      fragLoadingMaxRetry: 3,
    });
    instance.on(Hls.Events.MEDIA_ATTACHED, () => instance.loadSource(src));
    instance.on(Hls.Events.MANIFEST_PARSED, () => {
      // Ajustes → Qualidade: limita a resolução máxima escolhida pelo cliente.
      if (maxHeight !== null) {
        const allowed = instance.levels
          .map((level, i) => ({ i, h: level.height || 0 }))
          .filter((l) => l.h && l.h <= maxHeight);
        if (allowed.length) {
          instance.autoLevelCapping = allowed[allowed.length - 1].i;
        }
      }
      onReadyToPlay();
    });
    instance.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      const detail = `${data.type}${data.details ? ` • ${data.details}` : ""}`;
      fail(detail, () => {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad();
        else instance.recoverMediaError();
      });
    });
    instance.attachMedia(video);
    return {
      hlsApi: instance as unknown as HlsLike,
      destroy: () => instance.destroy(),
    };
  }

  const module = await import("mpegts.js");
  const mpegts = module.default;
  if (!mpegts?.isSupported()) {
    onFatal("mpegts-not-supported");
    return { hlsApi: null, destroy: () => undefined };
  }
  const player = mpegts.createPlayer(
    { type: "mpegts", isLive: live, url: src },
    {
      enableWorker: true,
      enableStashBuffer: true,
      stashInitialSize: preview ? 96 * 1024 : live ? 256 * 1024 : 1024 * 1024,
      lazyLoad: !live,
      lazyLoadMaxDuration: live ? 30 : 180,
      lazyLoadRecoverDuration: live ? 10 : 30,
      liveBufferLatencyChasing: live,
      liveBufferLatencyMaxLatency: preview ? 2 : 3,
      liveBufferLatencyMinRemain: 0.5,
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: live ? 30 : 120,
      autoCleanupMinBackwardDuration: live ? 15 : 60,
      fixAudioTimestampGap: true,
    },
  );
  const onError = (errorType: unknown, errorDetail: unknown) => {
    fail(`mpegts • ${String(errorType)} • ${String(errorDetail)}`, () => {
      player.unload();
      player.load();
      onReadyToPlay();
    });
  };
  player.on(mpegts.Events.ERROR, onError);
  player.attachMediaElement(video);
  player.load();
  onReadyToPlay();
  return {
    hlsApi: null,
    destroy: () => {
      player.off(mpegts.Events.ERROR, onError);
      try {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      } catch {
        /* já destruído */
      }
    },
  };
}
