import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { HlsLike } from "./useMediaTracks";

export type PlaybackEngine = "hls.js" | "mpegts.js" | "native";

type PlayerFailure = { message: string; detail?: string };

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  live: boolean;
};

const ENGINE_RETRIES = 2;
const STARTUP_TIMEOUT_MS = 18_000;
const STALL_TIMEOUT_MS = 20_000;

function sourceKind(src: string) {
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

async function playWithAutoplayFallback(video: HTMLVideoElement) {
  try {
    await video.play();
    return false;
  } catch {
    video.muted = true;
    await video.play();
    return true;
  }
}

export function useResilientPlayer({ videoRef, src, live }: Options) {
  const [engine, setEngine] = useState<PlaybackEngine | null>(null);
  const [hlsApi, setHlsApi] = useState<HlsLike | null>(null);
  const [buffering, setBuffering] = useState(Boolean(src));
  const [reconnecting, setReconnecting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mutedByAutoplay, setMutedByAutoplay] = useState(false);
  const [fatalError, setFatalError] = useState<PlayerFailure | null>(null);
  const [generation, setGeneration] = useState(0);
  const forceEngineRef = useRef<PlaybackEngine | null>(null);

  const retry = useCallback(() => {
    forceEngineRef.current = null;
    setFatalError(null);
    setAttempt(0);
    setBuffering(true);
    setGeneration((value) => value + 1);
  }, []);

  const tryOtherEngine = useCallback(() => {
    forceEngineRef.current = engine === "hls.js" ? "mpegts.js" : engine === "mpegts.js" ? "native" : "hls.js";
    setFatalError(null);
    setAttempt(0);
    setBuffering(true);
    setGeneration((value) => value + 1);
  }, [engine]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      setBuffering(false);
      setEngine(null);
      return;
    }

    let disposed = false;
    let cleanupEngine: (() => void) | undefined;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let engineIndex = 0;
    let engineRetries = 0;
    let lastProgressAt = Date.now();
    let lastTime = -1;

    const kind = sourceKind(src);
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
    const normalOrder: PlaybackEngine[] =
      kind === "hls"
        ? ["hls.js", "native", "mpegts.js"]
        : kind === "mpegts"
          ? ["mpegts.js", "native", "hls.js"]
          : ["native", "mpegts.js", "hls.js"];
    const forced = forceEngineRef.current;
    forceEngineRef.current = null;
    const engines = forced
      ? [forced, ...normalOrder.filter((candidate) => candidate !== forced)]
      : normalOrder;

    const clearTimers = () => {
      clearTimeout(recoveryTimer);
      clearTimeout(startupTimer);
      clearInterval(stallTimer);
    };

    const resetVideo = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const failAll = (detail?: string) => {
      if (disposed) return;
      clearTimers();
      setReconnecting(false);
      setBuffering(false);
      setFatalError({
        message: "Nenhum dos motores conseguiu reproduzir este stream",
        detail,
      });
    };

    const startNext = (reason?: string) => {
      if (disposed) return;
      clearTimers();
      cleanupEngine?.();
      cleanupEngine = undefined;
      setHlsApi(null);
      resetVideo();
      engineRetries = 0;
      engineIndex += 1;
      if (engineIndex >= engines.length) {
        failAll(reason);
        return;
      }
      setReconnecting(true);
      recoveryTimer = setTimeout(() => void startEngine(), 500);
    };

    const recoverOrFallback = (reason: string, recover?: () => void) => {
      if (disposed) return;
      if (recover && engineRetries < ENGINE_RETRIES) {
        engineRetries += 1;
        setAttempt(engineRetries);
        setReconnecting(true);
        recoveryTimer = setTimeout(() => {
          if (disposed) return;
          recover();
          setReconnecting(false);
        }, 700 * engineRetries);
        return;
      }
      startNext(reason);
    };

    const markPlaying = () => {
      lastProgressAt = Date.now();
      setBuffering(false);
      setReconnecting(false);
      setFatalError(null);
      clearTimeout(startupTimer);
    };

    const startAutoplay = async () => {
      try {
        const wasMuted = await playWithAutoplayFallback(video);
        if (!disposed && wasMuted) setMutedByAutoplay(true);
      } catch (error) {
        if (!disposed) recoverOrFallback("autoplay", () => video.load());
      }
    };

    const startNative = () => {
      const onError = () => recoverOrFallback(video.error?.message || "native-error", () => {
        video.load();
        void startAutoplay();
      });
      const onCanPlay = () => void startAutoplay();
      video.addEventListener("error", onError);
      video.addEventListener("canplay", onCanPlay);
      video.src = src;
      video.load();
      cleanupEngine = () => {
        video.removeEventListener("error", onError);
        video.removeEventListener("canplay", onCanPlay);
      };
    };

    const startHls = async () => {
      const { default: Hls } = await import("hls.js");
      if (disposed) return;
      if (!Hls.isSupported()) {
        if (nativeHls) startNative();
        else startNext("hls-not-supported");
        return;
      }
      const instance = new Hls({
        lowLatencyMode: live,
        enableWorker: true,
        backBufferLength: live ? 30 : 60,
        maxBufferLength: live ? 20 : 45,
        maxBufferHole: 1,
        manifestLoadingTimeOut: 12_000,
        levelLoadingTimeOut: 12_000,
        fragLoadingTimeOut: 15_000,
      });
      instance.on(Hls.Events.MEDIA_ATTACHED, () => instance.loadSource(src));
      instance.on(Hls.Events.MANIFEST_PARSED, () => void startAutoplay());
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        const detail = `${data.type}${data.details ? ` • ${data.details}` : ""}`;
        recoverOrFallback(detail, () => {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad();
          else instance.recoverMediaError();
        });
      });
      instance.attachMedia(video);
      setHlsApi(instance as unknown as HlsLike);
      cleanupEngine = () => instance.destroy();
    };

    const startMpegTs = async () => {
      const module = await import("mpegts.js");
      if (disposed) return;
      const mpegts = module.default;
      if (!mpegts?.isSupported()) {
        startNext("mpegts-not-supported");
        return;
      }
      const player = mpegts.createPlayer(
        { type: "mpegts", isLive: live, url: src },
        { enableWorker: true, enableStashBuffer: !live, lazyLoad: !live, autoCleanupSourceBuffer: true },
      );
      const onError = (errorType: unknown, errorDetail: unknown) => {
        recoverOrFallback(`mpegts • ${String(errorType)} • ${String(errorDetail)}`, () => {
          player.unload();
          player.load();
          void player.play().catch(() => undefined);
        });
      };
      player.on(mpegts.Events.ERROR, onError);
      player.attachMediaElement(video);
      player.load();
      void player.play().catch(() => void startAutoplay());
      cleanupEngine = () => {
        player.off(mpegts.Events.ERROR, onError);
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      };
    };

    async function startEngine() {
      if (disposed) return;
      const selected = engines[engineIndex];
      setEngine(selected);
      setAttempt(0);
      setBuffering(true);
      setReconnecting(engineIndex > 0);
      startupTimer = setTimeout(() => startNext(`${selected} • startup-timeout`), STARTUP_TIMEOUT_MS);
      try {
        if (selected === "hls.js") await startHls();
        else if (selected === "mpegts.js") await startMpegTs();
        else startNative();
      } catch (error) {
        startNext(`${selected} • ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const onPlaying = () => markPlaying();
    const onTimeUpdate = () => {
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastProgressAt = Date.now();
      }
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    stallTimer = setInterval(() => {
      if (!video.paused && !video.ended && Date.now() - lastProgressAt > STALL_TIMEOUT_MS) {
        startNext(`${engines[engineIndex]} • stream-stalled`);
      }
    }, 4_000);

    void startEngine();
    return () => {
      disposed = true;
      clearTimers();
      cleanupEngine?.();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      resetVideo();
      setHlsApi(null);
    };
  }, [generation, live, src, videoRef]);

  return {
    engine,
    hlsApi,
    buffering,
    reconnecting,
    attempt,
    fatalError,
    mutedByAutoplay,
    retry,
    tryOtherEngine,
  };
}