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
export async function attachEngine(
  video: HTMLVideoElement,
  engine: PlaybackEngine,
  options: AttachOptions,
): Promise<EngineHandles> {
  const { src, live, onFatal, onRecoverable, onReadyToPlay } = options;
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
    const instance = new Hls({
      lowLatencyMode: live,
      enableWorker: true,
      startFragPrefetch: true,
      testBandwidth: false,
      capLevelToPlayerSize: true,
      startLevel: -1,
      // Começa a tocar com o mínimo de dados possível.
      maxStarvationDelay: 2,
      maxLoadingDelay: 2,
      backBufferLength: live ? 20 : 90,
      maxBufferLength: live ? 30 : 60,
      maxMaxBufferLength: live ? 60 : 120,
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
    instance.on(Hls.Events.MANIFEST_PARSED, () => onReadyToPlay());
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
      stashInitialSize: live ? 256 * 1024 : 1024 * 1024,
      lazyLoad: !live,
      lazyLoadMaxDuration: live ? 30 : 180,
      lazyLoadRecoverDuration: live ? 10 : 30,
      liveBufferLatencyChasing: live,
      liveBufferLatencyMaxLatency: 3,
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
