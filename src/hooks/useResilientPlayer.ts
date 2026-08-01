import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { HlsLike } from "./useMediaTracks";
import {
  attachEngine,
  warmEngines,
  candidateOrder,
  playWithAutoplayFallback,
  type EngineHandles,
  type PlaybackCandidate,
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
  /** Desliga a reserva paralela em prévias, poupando banda e decoder da TV. */
  standby?: boolean;
  /** Prévia: qualidade/bitrate reduzidos para abrir o canal mais rápido. */
  preview?: boolean;
};

const ENGINE_RETRIES = 1;
const STARTUP_TIMEOUT_MS = 6_000;
const STALL_TIMEOUT_MS = 3_500;
/** Congelamento leve: tenta "cutucar" o stream antes de trocar de motor. */
const SOFT_STALL_MS = 900;
/** Troca imediata para a reserva assim que o congelamento passa deste tempo. */
const INSTANT_SWAP_MS = 700;
const STALL_CHECK_MS = 200;
const NUDGE_MAX = 1;
/** VOD: a reserva fica sempre próxima da posição atual para trocar sem seek. */
const STANDBY_SYNC_TOLERANCE_S = 4;
const STANDBY_SYNC_EVERY_MS = 3_000;
/** Pequeno avanço para a reserva já ter buffer à frente no momento da troca. */
const STANDBY_LEAD_S = 0.6;
/**
 * A reserva só começa a baixar depois que o motor principal engatou. No começo
 * a banda inteira fica para o vídeo que o cliente está esperando; qualquer
 * sinal de travamento antecipa a reserva na hora (prewarmStandby).
 */
const STANDBY_WARMUP_MS = 2_500;
/** Quantas vezes toda a cadeia de motores é repetida automaticamente antes de desistir. */
const AUTO_CYCLE_MAX = 4;
const AUTO_CYCLE_BACKOFF_MS = [1_500, 3_000, 6_000, 10_000];

export function useResilientPlayer({
  videoRef,
  slotARef,
  slotBRef,
  src,
  live,
  standby = true,
  preview = false,
}: Options) {
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

    // Biblioteca e conexão já aquecidas: o attach abaixo não espera download.
    warmEngines(src);

    let disposed = false;
    let activeSlotLocal: PlayerSlot = "a";
    let activeIndex = 0;
    let standbyIndex = 1;
    let engineRetries = 0;
    let standbyOk = false;
    let lastProgressAt = Date.now();
    let lastTime = -1;
    let nudges = 0;
    let lastNudgeAt = 0;
    let standbyStarted = false;
    const handles: Record<PlayerSlot, EngineHandles | null> = { a: null, b: null };
    const timers = {
      recovery: undefined as ReturnType<typeof setTimeout> | undefined,
      startup: undefined as ReturnType<typeof setTimeout> | undefined,
      warmup: undefined as ReturnType<typeof setTimeout> | undefined,
      stall: undefined as ReturnType<typeof setInterval> | undefined,
    };

    const elementFor = (slot: PlayerSlot) => (slot === "a" ? slotA : slotB);
    const other = (slot: PlayerSlot): PlayerSlot => (slot === "a" ? "b" : "a");

    const order: PlaybackCandidate[] = (() => {
      const normal = candidateOrder(src);
      const forced = forceEngineRef.current;
      forceEngineRef.current = null;
      if (!forced) return normal;
      const first = normal.filter((item) => item.engine === forced);
      return [...first, ...normal.filter((item) => item.engine !== forced)];
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


    /**
     * Mantém a reserva (VOD) alinhada com a posição atual, de modo que a troca
     * de motor não precise de seek — é isso que torna o failover instantâneo.
     */
    let lastStandbySyncAt = 0;
    const syncStandbyPosition = (force = false) => {
      if (disposed || live || !standbyStarted) return;
      const now = Date.now();
      if (!force && now - lastStandbySyncAt < STANDBY_SYNC_EVERY_MS) return;
      lastStandbySyncAt = now;
      const activeVideo = elementFor(activeSlotLocal);
      const standbyVideo = elementFor(other(activeSlotLocal));
      const target = activeVideo.currentTime + STANDBY_LEAD_S;
      if (!Number.isFinite(target) || target <= 0) return;
      if (Math.abs(standbyVideo.currentTime - target) < STANDBY_SYNC_TOLERANCE_S) return;
      try {
        standbyVideo.currentTime = target;
        // Um respiro tocando garante que o novo trecho entre no buffer.
        void standbyVideo.play().catch(() => undefined);
        setTimeout(() => {
          if (disposed || !standbyOk) return;
          try {
            standbyVideo.pause();
          } catch {
            /* noop */
          }
        }, 900);
      } catch {
        /* stream sem seek */
      }
    };

    /* ── Reserva quente: segundo motor pré-carregado em paralelo, mudo e pausado ── */
    const startStandby = () => {
      if (!standby || disposed || standbyIndex >= order.length) {
        setStandbyEngine(null);
        return;
      }
      const slot = other(activeSlotLocal);
      const selected = order[standbyIndex];
      standbyOk = false;
      setStandbyReady(false);
      setStandbyEngine(selected.engine);
      resetSlot(slot);
      const video = elementFor(slot);
      video.muted = true;

      const markReady = () => {
        if (disposed) return;
        standbyOk = true;
        setStandbyReady(true);
        if (live) {
          // Ao vivo: a reserva continua tocando muda para não ficar defasada da
          // borda; assim a promoção mostra imagem no mesmo instante.
          void video.play().catch(() => undefined);
        } else {
          // VOD: alinha a reserva com a posição atual e mantém buffer parado.
          syncStandbyPosition(true);
          try {
            video.pause();
          } catch {
            /* noop */
          }
        }
        video.removeEventListener("playing", markReady);
      };
      video.addEventListener("playing", markReady);

      void attachEngine(video, selected.engine, {
        src: selected.src,
        live,
        preview,
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
      if (!standby) return;
      clearTimeout(timers.warmup);
      standbyStarted = false;
      timers.warmup = setTimeout(() => {
        standbyStarted = true;
        startStandby();
      }, STANDBY_WARMUP_MS);
    };

    /** Antecipa a reserva quente assim que aparece o primeiro sinal de travamento. */
    const prewarmStandby = () => {
      if (!standby || disposed || standbyStarted || standbyOk) return;
      clearTimeout(timers.warmup);
      standbyStarted = true;
      startStandby();
    };

    /* ── Troca instantânea para a instância reserva ── */
    const promoteStandby = () => {
      if (disposed || !standbyOk) return false;
      // Só promove se a reserva realmente tem quadro pronto: trocar para um
      // vídeo vazio deixaria a tela preta em vez de continuar a exibição.
      if (elementFor(other(activeSlotLocal)).readyState < 2) return false;
      clearActiveTimers();
      const oldSlot = activeSlotLocal;
      const newSlot = other(oldSlot);
      const oldVideo = elementFor(oldSlot);
      const newVideo = elementFor(newSlot);
      const position = oldVideo.currentTime;
      const wasMuted = oldVideo.muted;
      const volume = oldVideo.volume;
      const playbackRate = oldVideo.playbackRate;

      handles[newSlot] && setHlsApi(handles[newSlot]?.hlsApi ?? null);
      activeSlotLocal = newSlot;
      activeIndex = standbyIndex;
      standbyIndex = activeIndex + 1;
      engineRetries = 0;
      standbyOk = false;
      standbyStarted = false;
      nudges = 0;
      lastProgressAt = Date.now();
      lastTime = -1;

      videoRef.current = newVideo;
      setActiveSlot(newSlot);
      setEngine(order[activeIndex].engine);
      setStandbyReady(false);
      setStandbyEngine(null);
      setFatalError(null);
      setAttempt(0);
      setReconnecting(false);

      newVideo.muted = wasMuted;
      newVideo.volume = volume;
      newVideo.playbackRate = playbackRate;
      // A reserva já vem sincronizada; só corrige se estiver realmente longe,
      // evitando um seek (que custaria segundos de rebuffer) na troca.
      if (!live && position > 0 && Math.abs(newVideo.currentTime - position) > 2) {
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

      // Só derruba o motor antigo depois que o reserva já foi promovido.
      resetSlot(oldSlot);

      attachWatchdog();
      scheduleStandby();
      return true;
    };

    /* ── Cutucão: destrava buffer preso sem derrubar o motor atual ── */
    const nudge = () => {
      if (disposed) return;
      const video = elementFor(activeSlotLocal);
      nudges += 1;
      lastNudgeAt = Date.now();
      setBuffering(true);
      setReconnecting(true);
      // Reserva quente já começa a carregar em segundo plano.
      prewarmStandby();
      const api = handles[activeSlotLocal]?.hlsApi as
        | (HlsLike & { startLoad?: (pos?: number) => void; recoverMediaError?: () => void })
        | null
        | undefined;
      try {
        if (nudges >= 2) api?.recoverMediaError?.();
        api?.startLoad?.(-1);
      } catch {
        /* motor sem API de recarga */
      }
      try {
        if (live) {
          // Volta para a borda ao vivo (fim do buffer disponível).
          const ranges = video.buffered;
          if (ranges.length > 0) {
            const edge = ranges.end(ranges.length - 1);
            if (edge - video.currentTime > 0.5) video.currentTime = Math.max(0, edge - 0.5);
          }
        } else {
          // Micro-seek para forçar o decoder a retomar.
          video.currentTime = video.currentTime + 0.25;
        }
      } catch {
        /* stream sem seek */
      }
      void video.play().catch(() => undefined);
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
      // O próximo motor começa no mesmo ciclo de evento, sem pausa artificial.
      void startActive();
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
        }, 250);
        return;
      }
      startNext(reason);
    };

    const startAutoplay = async () => {
      const video = elementFor(activeSlotLocal);
      // Retoma de onde parou após um ciclo completo de recuperação (VOD).
      if (!live && resumeAtRef.current > 0 && video.currentTime < resumeAtRef.current - 1) {
        try {
          video.currentTime = resumeAtRef.current;
        } catch {
          /* stream sem seek */
        }
      }
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
      setEngine(selected.engine);
      setAttempt(0);
      setBuffering(true);
      setReconnecting(activeIndex > 0 || cycleRef.current > 0);
      attachWatchdog();
      timers.startup = setTimeout(
        () => startNext(`${selected.engine} • startup-timeout`),
        STARTUP_TIMEOUT_MS,
      );
      try {
        const instance = await attachEngine(video, selected.engine, {
          src: selected.src,
          live,
          preview,
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
        // A reserva começa assim que o motor principal está ligado.
        scheduleStandby();
      } catch (error) {
        startNext(`${selected.engine} • ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    /* ── Watchdog: erro de mídia ou congelamento dispara recuperação/failover ── */
    let detachWatchdog: (() => void) | undefined;
    function attachWatchdog() {
      detachWatchdog?.();
      const video = elementFor(activeSlotLocal);
      const onPlaying = () => {
        lastProgressAt = Date.now();
        setBuffering(false);
        // Memoriza o container que entrou no ar (.ts/.m3u8) para o próximo zap.
        if (live) rememberLiveFormat(order[activeIndex]?.src ?? "");
        setReconnecting(false);
        setFatalError(null);
        clearTimeout(timers.startup);
        // Reprodução saudável: zera contadores de recuperação.
        engineRetries = 0;
        nudges = 0;
        if (cycleRef.current !== 0) {
          cycleRef.current = 0;
          setRecoveryCycle(0);
        }
        setAttempt(0);
      };
      const onTimeUpdate = () => {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
          if (!live && video.currentTime > 0) resumeAtRef.current = video.currentTime;
        }
      };
      const onWaiting = () => {
        setBuffering(true);
        // Reserva pronta: troca na hora, sem esperar o vigia de travamento.
        if (standbyOk && promoteStandby()) return;
        prewarmStandby();
      };
      // "stalled"/"suspend": os dados pararam de chegar — prepara a reserva já.
      const onStalled = () => {
        setBuffering(true);
        if (video.paused || video.ended) return;
        if (standbyOk && promoteStandby()) return;
        prewarmStandby();
      };
      const onMediaError = () => {
        const code = video.error?.code;
        // Erro fatal de mídia com reserva pronta: troca imediata, sem retentativa.
        if (standbyOk && promoteStandby()) return;
        recoverOrFallback(`media-error${code ? ` • code ${code}` : ""}`, () => {
          try {
            video.load();
            void video.play().catch(() => undefined);
          } catch {
            /* elemento indisponível */
          }
        });
      };
      video.addEventListener("playing", onPlaying);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("stalled", onStalled);
      video.addEventListener("suspend", onStalled);
      video.addEventListener("error", onMediaError);
      detachWatchdog = () => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("stalled", onStalled);
        video.removeEventListener("suspend", onStalled);
        video.removeEventListener("error", onMediaError);
      };
    }

    /* ── Rede de volta / app em foco: acelera a retomada sem recarregar a página ── */
    const kickRecovery = (reason: string) => {
      if (disposed) return;
      const video = elementFor(activeSlotLocal);
      if (video.paused && !video.ended) {
        void video.play().catch(() => undefined);
      }
      if (Date.now() - lastProgressAt > 6_000) {
        lastProgressAt = Date.now();
        startNext(reason);
      }
    };
    const onOnline = () => kickRecovery("network-restored");
    const onVisible = () => {
      if (document.visibilityState === "visible") kickRecovery("tab-visible");
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    attachWatchdog();
    /* ── Vigia de travamento em escala: cutucão → reserva quente → troca de motor ── */
    timers.stall = setInterval(() => {
      if (disposed) return;
      const video = elementFor(activeSlotLocal);
      if (video.ended) return;
      const idle = Date.now() - lastProgressAt;

      // Pausa não solicitada (aba, foco, decoder): tenta voltar a tocar sozinho.
      if (video.paused) {
        if (idle > SOFT_STALL_MS && video.readyState >= 2) {
          void video.play().catch(() => undefined);
        }
        return;
      }

      if (idle > STALL_TIMEOUT_MS) {
        nudges = 0;
        startNext(`${order[activeIndex].engine} • stream-stalled`);
        return;
      }

      // Troca instantânea: menos de 1s de congelamento já promove a reserva.
      if (idle > INSTANT_SWAP_MS && standbyOk) {
        if (promoteStandby()) return;
      }

      if (idle > SOFT_STALL_MS) {
        prewarmStandby();
        if (nudges < NUDGE_MAX && Date.now() - lastNudgeAt > 800) nudge();
        return;
      }

      // Fluxo saudável: mantém a reserva colada na posição atual (VOD).
      syncStandbyPosition();
    }, STALL_CHECK_MS);


    void startActive();
    return () => {
      disposed = true;
      clearAllTimers();
      detachWatchdog?.();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      resetSlot("a");
      resetSlot("b");
      setHlsApi(null);
      setStandbyReady(false);
      setStandbyEngine(null);
    };
  }, [generation, live, preview, src, slotARef, slotBRef, standby, videoRef]);

  return {
    engine,
    standbyEngine,
    standbyReady,
    activeSlot,
    hlsApi,
    buffering,
    reconnecting,
    attempt,
    recoveryCycle,
    fatalError,

    mutedByAutoplay,
    retry,
    tryOtherEngine,
  };
}
