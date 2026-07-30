import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { HlsLike } from "./useMediaTracks";
import {
  attachEngine,
  engineOrder,
  playWithAutoplayFallback,
  type EngineHandles,
  type PlaybackEngine,
} from "./player-engines";

export type { PlaybackEngine } from "./player-engines";

export type PlayerSlot = "a" | "b";

type PlayerFailure = { message: string; detail?: string };

type Options = {
  /** Espelho: aponta sempre para o <video> ativo. */
  videoRef: RefObject<HTMLVideoElement | null>;
  slotARef: RefObject<HTMLVideoElement | null>;
  slotBRef: RefObject<HTMLVideoElement | null>;
  src: string;
  live: boolean;
};

const ENGINE_RETRIES = 2;
const STARTUP_TIMEOUT_MS = 18_000;
const STALL_TIMEOUT_MS = 20_000;
const STANDBY_WARMUP_MS = 3_500;
/** Quantas vezes toda a cadeia de motores é repetida automaticamente antes de desistir. */
const AUTO_CYCLE_MAX = 4;
const AUTO_CYCLE_BACKOFF_MS = [1_500, 3_000, 6_000, 10_000];

export function useResilientPlayer({ videoRef, slotARef, slotBRef, src, live }: Options) {
  const [engine, setEngine] = useState<PlaybackEngine | null>(null);
  const [standbyEngine, setStandbyEngine] = useState<PlaybackEngine | null>(null);
  const [standbyReady, setStandbyReady] = useState(false);
  const [activeSlot, setActiveSlot] = useState<PlayerSlot>("a");
  const [hlsApi, setHlsApi] = useState<HlsLike | null>(null);
  const [buffering, setBuffering] = useState(Boolean(src));
  const [reconnecting, setReconnecting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mutedByAutoplay, setMutedByAutoplay] = useState(false);
  const [fatalError, setFatalError] = useState<PlayerFailure | null>(null);
  const [generation, setGeneration] = useState(0);
  const [recoveryCycle, setRecoveryCycle] = useState(0);
  const forceEngineRef = useRef<PlaybackEngine | null>(null);
  const cycleRef = useRef(0);
  /** Posição a retomar em VOD depois de um ciclo completo de recuperação. */
  const resumeAtRef = useRef(0);

  const retry = useCallback(() => {
    forceEngineRef.current = null;
    cycleRef.current = 0;
    setRecoveryCycle(0);
    setFatalError(null);
    setAttempt(0);
    setBuffering(true);
    setGeneration((value) => value + 1);
  }, []);

  const tryOtherEngine = useCallback(() => {
    forceEngineRef.current =
      engine === "hls.js" ? "mpegts.js" : engine === "mpegts.js" ? "native" : "hls.js";
    cycleRef.current = 0;
    setRecoveryCycle(0);
    setFatalError(null);
    setAttempt(0);
    setBuffering(true);
    setGeneration((value) => value + 1);
  }, [engine]);

  /* Nova fonte: zera o contador de ciclos e a posição memorizada. */
  useEffect(() => {
    cycleRef.current = 0;
    resumeAtRef.current = 0;
    setRecoveryCycle(0);
  }, [src]);


  useEffect(() => {
    const slotA = slotARef.current;
    const slotB = slotBRef.current;
    if (!slotA || !slotB || !src) {
      setBuffering(false);
      setEngine(null);
      setStandbyEngine(null);
      setStandbyReady(false);
      return;
    }

    let disposed = false;
    let activeSlotLocal: PlayerSlot = "a";
    let activeIndex = 0;
    let standbyIndex = 1;
    let engineRetries = 0;
    let standbyOk = false;
    let lastProgressAt = Date.now();
    let lastTime = -1;
    const handles: Record<PlayerSlot, EngineHandles | null> = { a: null, b: null };
    const timers = {
      recovery: undefined as ReturnType<typeof setTimeout> | undefined,
      startup: undefined as ReturnType<typeof setTimeout> | undefined,
      warmup: undefined as ReturnType<typeof setTimeout> | undefined,
      stall: undefined as ReturnType<typeof setInterval> | undefined,
    };

    const elementFor = (slot: PlayerSlot) => (slot === "a" ? slotA : slotB);
    const other = (slot: PlayerSlot): PlayerSlot => (slot === "a" ? "b" : "a");

    const order = (() => {
      const normal = engineOrder(src);
      const forced = forceEngineRef.current;
      forceEngineRef.current = null;
      return forced ? [forced, ...normal.filter((item) => item !== forced)] : normal;
    })();

    const clearActiveTimers = () => {
      clearTimeout(timers.recovery);
      clearTimeout(timers.startup);
    };
    const clearAllTimers = () => {
      clearActiveTimers();
      clearTimeout(timers.warmup);
      clearInterval(timers.stall);
    };

    const resetSlot = (slot: PlayerSlot) => {
      const video = elementFor(slot);
      handles[slot]?.destroy();
      handles[slot] = null;
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        /* elemento já desmontado */
      }
    };

    /* ── Cadeia esgotada: reinicia todo o ciclo automaticamente, com backoff ── */
    const failAll = (detail?: string) => {
      if (disposed) return;
      clearAllTimers();
      // Memoriza a posição para retomar de onde parou (VOD).
      if (!live) {
        const current = elementFor(activeSlotLocal).currentTime;
        if (Number.isFinite(current) && current > 0) resumeAtRef.current = current;
      }
      resetSlot("a");
      resetSlot("b");
      setHlsApi(null);
      setStandbyEngine(null);
      setStandbyReady(false);

      if (cycleRef.current < AUTO_CYCLE_MAX) {
        const wait = AUTO_CYCLE_BACKOFF_MS[Math.min(cycleRef.current, AUTO_CYCLE_BACKOFF_MS.length - 1)];
        cycleRef.current += 1;
        setRecoveryCycle(cycleRef.current);
        setFatalError(null);
        setReconnecting(true);
        setBuffering(true);
        timers.recovery = setTimeout(() => {
          if (disposed) return;
          setGeneration((value) => value + 1);
        }, wait);
        return;
      }

      setReconnecting(false);
      setBuffering(false);
      setFatalError({ message: "Nenhum dos motores conseguiu reproduzir este stream", detail });
    };


    /* ── Reserva quente: segundo motor pré-carregado em paralelo, mudo e pausado ── */
    const startStandby = () => {
      if (disposed || standbyIndex >= order.length) {
        setStandbyEngine(null);
        return;
      }
      const slot = other(activeSlotLocal);
      const selected = order[standbyIndex];
      standbyOk = false;
      setStandbyReady(false);
      setStandbyEngine(selected);
      resetSlot(slot);
      const video = elementFor(slot);
      video.muted = true;

      const markReady = () => {
        if (disposed) return;
        standbyOk = true;
        setStandbyReady(true);
        // Mantém o buffer, mas sem consumir banda continuamente.
        try {
          video.pause();
        } catch {
          /* noop */
        }
        video.removeEventListener("playing", markReady);
      };
      video.addEventListener("playing", markReady);

      void attachEngine(video, selected, {
        src,
        live,
        onReadyToPlay: () => {
          void video.play().catch(() => undefined);
        },
        onFatal: () => {
          if (disposed) return;
          video.removeEventListener("playing", markReady);
          standbyOk = false;
          setStandbyReady(false);
          standbyIndex += 1;
          startStandby();
        },
      })
        .then((instance) => {
          if (disposed) {
            instance.destroy();
            return;
          }
          handles[slot] = instance;
        })
        .catch(() => {
          standbyIndex += 1;
          startStandby();
        });
    };

    const scheduleStandby = () => {
      clearTimeout(timers.warmup);
      timers.warmup = setTimeout(startStandby, STANDBY_WARMUP_MS);
    };

    /* ── Troca instantânea para a instância reserva ── */
    const promoteStandby = () => {
      if (disposed || !standbyOk) return false;
      clearActiveTimers();
      const oldSlot = activeSlotLocal;
      const newSlot = other(oldSlot);
      const oldVideo = elementFor(oldSlot);
      const newVideo = elementFor(newSlot);
      const position = oldVideo.currentTime;
      const wasMuted = oldVideo.muted;

      handles[newSlot] && setHlsApi(handles[newSlot]?.hlsApi ?? null);
      resetSlot(oldSlot);

      activeSlotLocal = newSlot;
      activeIndex = standbyIndex;
      standbyIndex = activeIndex + 1;
      engineRetries = 0;
      standbyOk = false;
      lastProgressAt = Date.now();
      lastTime = -1;

      videoRef.current = newVideo;
      setActiveSlot(newSlot);
      setEngine(order[activeIndex]);
      setStandbyReady(false);
      setStandbyEngine(null);
      setFatalError(null);
      setAttempt(0);
      setReconnecting(false);

      newVideo.muted = wasMuted;
      if (!live && position > 0) {
        try {
          newVideo.currentTime = position;
        } catch {
          /* stream sem seek */
        }
      }
      void playWithAutoplayFallback(newVideo)
        .then((forcedMute) => {
          if (!disposed && forcedMute) setMutedByAutoplay(true);
        })
        .catch(() => undefined);

      attachWatchdog();
      scheduleStandby();
      return true;
    };

    const startNext = (reason?: string) => {
      if (disposed) return;
      if (promoteStandby()) return;
      clearActiveTimers();
      resetSlot(activeSlotLocal);
      setHlsApi(null);
      engineRetries = 0;
      activeIndex = Math.max(activeIndex + 1, standbyIndex);
      standbyIndex = activeIndex + 1;
      if (activeIndex >= order.length) {
        failAll(reason);
        return;
      }
      setReconnecting(true);
      timers.recovery = setTimeout(() => void startActive(), 500);
    };

    const recoverOrFallback = (reason: string, recover?: () => void) => {
      if (disposed) return;
      if (recover && engineRetries < ENGINE_RETRIES && !standbyOk) {
        engineRetries += 1;
        setAttempt(engineRetries);
        setReconnecting(true);
        timers.recovery = setTimeout(() => {
          if (disposed) return;
          recover();
          setReconnecting(false);
        }, 700 * engineRetries);
        return;
      }
      startNext(reason);
    };

    const startAutoplay = async () => {
      const video = elementFor(activeSlotLocal);
      try {
        const wasMuted = await playWithAutoplayFallback(video);
        if (!disposed && wasMuted) setMutedByAutoplay(true);
      } catch {
        if (!disposed) recoverOrFallback("autoplay", () => video.load());
      }
    };

    async function startActive() {
      if (disposed) return;
      const slot = activeSlotLocal;
      const selected = order[activeIndex];
      const video = elementFor(slot);
      videoRef.current = video;
      setActiveSlot(slot);
      setEngine(selected);
      setAttempt(0);
      setBuffering(true);
      setReconnecting(activeIndex > 0);
      timers.startup = setTimeout(
        () => startNext(`${selected} • startup-timeout`),
        STARTUP_TIMEOUT_MS,
      );
      try {
        const instance = await attachEngine(video, selected, {
          src,
          live,
          onReadyToPlay: () => void startAutoplay(),
          onRecoverable: (reason, recover) => recoverOrFallback(reason, recover),
          onFatal: (reason) => startNext(reason),
        });
        if (disposed) {
          instance.destroy();
          return;
        }
        handles[slot] = instance;
        setHlsApi(instance.hlsApi);
        scheduleStandby();
      } catch (error) {
        startNext(`${selected} • ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    /* ── Watchdog: congelamento do stream ativo dispara o failover ── */
    let detachWatchdog: (() => void) | undefined;
    function attachWatchdog() {
      detachWatchdog?.();
      const video = elementFor(activeSlotLocal);
      const onPlaying = () => {
        lastProgressAt = Date.now();
        setBuffering(false);
        setReconnecting(false);
        setFatalError(null);
        clearTimeout(timers.startup);
      };
      const onTimeUpdate = () => {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
        }
      };
      video.addEventListener("playing", onPlaying);
      video.addEventListener("timeupdate", onTimeUpdate);
      detachWatchdog = () => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("timeupdate", onTimeUpdate);
      };
    }

    attachWatchdog();
    timers.stall = setInterval(() => {
      const video = elementFor(activeSlotLocal);
      if (!video.paused && !video.ended && Date.now() - lastProgressAt > STALL_TIMEOUT_MS) {
        startNext(`${order[activeIndex]} • stream-stalled`);
      }
    }, 4_000);

    void startActive();
    return () => {
      disposed = true;
      clearAllTimers();
      detachWatchdog?.();
      resetSlot("a");
      resetSlot("b");
      setHlsApi(null);
      setStandbyReady(false);
      setStandbyEngine(null);
    };
  }, [generation, live, src, slotARef, slotBRef, videoRef]);

  return {
    engine,
    standbyEngine,
    standbyReady,
    activeSlot,
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
