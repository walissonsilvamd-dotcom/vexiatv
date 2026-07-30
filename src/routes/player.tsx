import { matchesLegacyId } from "../utils/hash";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Captions,
  ChevronsLeftRight,
  Gauge,
  Heart,
  Loader2,
  Maximize,
  Pause,
  Play,
  Rewind,
  FastForward,
  Settings,
  SkipBack,
  SkipForward,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/vexia/ConfirmDialog";
import { EpisodeCarousel } from "../components/vexia/EpisodeCarousel";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { usePlaylist } from "../lib/playlist-store";
import { clearProgress, saveProgress, useProgress } from "../lib/progress-store";
import {
  completeWatch,
  historyKey,
  recordWatch,
  removeWatch,
  type WatchKind,
} from "../lib/history-store";

type PlayerSearch = { type: "live" | "movie" | "series"; id: string; ep?: string };

export const Route = createFileRoute("/player")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): PlayerSearch => ({
    type:
      search.type === "live" || search.type === "series" || search.type === "movie"
        ? search.type
        : "movie",
    id: String(search.id ?? ""),
    ep: search.ep ? String(search.ep) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Player" },
      {
        name: "description",
        content:
          "Player VÉXIA TV com suporte a HLS, canais ao vivo, filmes e séries, com progresso salvo e controles para TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Player" },
      {
        property: "og:description",
        content: "Reprodução de canais ao vivo, filmes e séries direto da sua lista.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerPage,
});

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ["Auto", "4K", "FHD", "HD", "SD"];
const MAX_RETRIES = 3;

function PlayerPage() {
  const { type, id, ep } = Route.useSearch();
  const navigate = useNavigate();
  const { movies, series, channels } = usePlaylist();
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTap = useRef(0);
  const watchMetaRef = useRef<{ kind: WatchKind; name: string } | null>(null);

  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fav, setFav] = useState(false);
  const [menu, setMenu] = useState<null | "quality" | "audio" | "subs" | "speed">(null);
  const menuOpenRef = useRef(false);
  const [quality, setQuality] = useState("Auto");
  const [speed, setSpeed] = useState(1);
  const [hlsApi, setHlsApi] = useState<HlsLike | null>(null);
  const [mediaReady, setMediaReady] = useState(false);

  const [liveDelay, setLiveDelay] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [fatalError, setFatalError] = useState<{ message: string; detail?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const channel =
    type === "live"
      ? (channels.find((c) => c.id === id) ?? channels.find((c) => matchesLegacyId(id, c.name)))
      : undefined;
  const movie =
    type === "movie"
      ? (movies.find((m) => m.id === id) ?? movies.find((m) => matchesLegacyId(id, m.title)))
      : undefined;
  const serie =
    type === "series"
      ? (series.find((s) => s.id === id) ?? series.find((s) => matchesLegacyId(id, s.title)))
      : undefined;

  const episodes = useMemo(
    () =>
      serie
        ? [...serie.episodesList].sort((a, b) => a.season - b.season || a.number - b.number)
        : [],
    [serie],
  );
  const epIndex = Math.max(
    0,
    episodes.findIndex((e) => e.id === ep),
  );
  const episode = episodes[epIndex];
  const nextEpisode = episodes[epIndex + 1];
  const prevEpisode = episodes[epIndex - 1];

  const src = channel?.url ?? movie?.streamUrl ?? episode?.url ?? "";
  const progressKey = type === "series" && episode ? `${id}::${episode.id}` : id;
  const { entryFor } = useProgress(id);
  const savedEntry = entryFor(progressKey);
  const [resumeAsk, setResumeAsk] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);

  const title =
    channel?.name ?? movie?.title ?? (serie ? serie.title : "") ?? "Conteúdo indisponível";
  const kindLabel = type === "live" ? "AO VIVO" : type === "movie" ? "FILME" : "SÉRIE";

  /* ── Motor de reprodução (HLS / MPEG-TS / progressivo) ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    let retries = 0;
    let backoff: ReturnType<typeof setTimeout> | undefined;

    const isHls = /\.m3u8(\?|$)/i.test(src) || /\.ts(\?|$)/i.test(src);
    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    const fail = (message: string, detail?: string) => {
      if (destroyed) return;
      setReconnecting(false);
      setBuffering(false);
      setFatalError({ message, detail });
    };

    async function attach() {
      if (!video) return;
      setFatalError(null);
      setBuffering(true);
      if (isHls && !nativeHls) {
        const { default: Hls } = await import("hls.js");
        if (destroyed || !video) return;
        if (Hls.isSupported()) {
          const instance = new Hls({
            lowLatencyMode: type === "live",
            backBufferLength: 60,
            maxBufferLength: 30,
          });
          instance.loadSource(src);
          instance.attachMedia(video);
          instance.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (retries >= MAX_RETRIES) {
              instance.destroy();
              fail(
                data.type === Hls.ErrorTypes.NETWORK_ERROR
                  ? "Falha de conexão com o servidor da lista"
                  : "Não foi possível decodificar este stream",
                `${data.type}${data.details ? ` • ${data.details}` : ""}`,
              );
              return;
            }
            retries += 1;
            setAttempt(retries);
            setReconnecting(true);
            backoff = setTimeout(
              () => {
                if (destroyed) return;
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance.startLoad();
                else instance.recoverMediaError();
                setReconnecting(false);
              },
              Math.min(6000, 1200 * retries),
            );
          });
          hls = instance;
          return;
        }
        fail("Este dispositivo não suporta a reprodução deste formato");
        return;
      }
      video.src = src;
      video.load();
    }

    const onNativeError = () => {
      if (retries >= MAX_RETRIES) {
        fail("Não foi possível carregar o stream", video.error?.message || undefined);
        return;
      }
      retries += 1;
      setAttempt(retries);
      setReconnecting(true);
      backoff = setTimeout(
        () => {
          if (destroyed || !video) return;
          video.load();
          void video.play().catch(() => undefined);
          setReconnecting(false);
        },
        Math.min(6000, 1200 * retries),
      );
    };
    video.addEventListener("error", onNativeError);

    void attach();
    return () => {
      destroyed = true;
      clearTimeout(backoff);
      video.removeEventListener("error", onNativeError);
      hls?.destroy();
    };
  }, [src, type, retryNonce]);


  /* ── Eventos do vídeo ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      setCurrent(video.currentTime);
      if (type === "live" && video.seekable.length) {
        setLiveDelay(Math.max(0, video.seekable.end(0) - video.currentTime));
      }
    };
    const onMeta = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnded = () => {
      if (watchMetaRef.current?.name && type !== "live") {
        completeWatch(watchMetaRef.current.kind, watchMetaRef.current.name);
      }
      if (nextEpisode) navigate({ to: "/player", search: { type, id, ep: nextEpisode.id } });
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
    };
  }, [type, id, nextEpisode, navigate]);

  /* ── Retomar de onde parou ── */
  useEffect(() => {
    if (type === "live") return;
    if (savedEntry && savedEntry.percent > 2 && savedEntry.percent < 95) setResumeAsk(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey]);

  /* ── Histórico: dados do conteúdo em reprodução ── */
  const watchMeta = useMemo(() => {
    const kind: WatchKind = type === "live" ? "channel" : type === "movie" ? "movie" : "series";
    const name = channel?.name ?? movie?.title ?? serie?.title ?? "";
    return {
      kind,
      id,
      name,
      poster: channel?.logo ?? movie?.poster ?? serie?.poster,
      url: src,
      category: channel?.category ?? movie?.genres?.[0] ?? serie?.genres?.[0],
      season: episode?.season,
      episode: episode?.number,
      episodeId: episode?.id,
      episodeName: episode?.title,
    };
  }, [type, id, src, channel, movie, serie, episode]);

  /* ── Salvar progresso + histórico (a cada 10s) ── */
  useEffect(() => {
    watchMetaRef.current = { kind: watchMeta.kind, name: watchMeta.name };
    if (!watchMeta.name) return;
    const snapshot = (force = false) => {
      const video = videoRef.current;
      if (!video) return;
      if (type === "live") {
        recordWatch({ ...watchMeta, positionSec: 0, durationSec: 0, percent: 0, completed: false });
        return;
      }
      if (!video.duration || (!force && video.paused)) return;
      const percent = (video.currentTime / video.duration) * 100;
      saveProgress(progressKey, {
        percent,
        positionSec: video.currentTime,
        durationSec: video.duration,
        label: episode ? `${title} • T${episode.season}E${episode.number}` : title,
      });
      recordWatch({
        ...watchMeta,
        positionSec: video.currentTime,
        durationSec: video.duration,
        percent,
      });
    };

    snapshot();
    const t = window.setInterval(() => snapshot(), 10000);
    return () => {
      window.clearInterval(t);
      // Salva imediatamente ao sair do player.
      snapshot(true);
    };
  }, [type, progressKey, title, episode, watchMeta]);

  const ping = useCallback(() => {
    setShowControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
      setMenu(null);
    }, 5000);
  }, []);

  useEffect(() => {
    ping();
    return () => window.clearTimeout(hideTimer.current);
  }, [ping]);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
    ping();
  }, [ping]);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = Math.max(0, video.currentTime + delta);
      ping();
    },
    [ping],
  );

  const goBack = useCallback(() => {
    if (menu) return setMenu(null);
    if (type === "live") return void navigate({ to: "/canais" });
    navigate({ to: "/detalhes/$id", params: { id } });
  }, [menu, navigate, type, id]);

  const retryStream = useCallback(() => {
    setFatalError(null);
    setAttempt(0);
    setBuffering(true);
    setRetryNonce((n) => n + 1);
  }, []);



  /* ── Navegação Android TV / teclado ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      ping();
      if (fatalError && (e.key === "Enter" || e.key === " " || e.key === "MediaPlayPause")) {
        e.preventDefault();
        retryStream();
        return;
      }
      // Foco dentro do carrossel: setas navegam entre episódios.
      const inCarousel =
        !!carouselRef.current &&
        carouselRef.current.contains(document.activeElement) &&
        document.activeElement !== document.body;
      if (inCarousel) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const cards = Array.from(
            carouselRef.current!.querySelectorAll<HTMLButtonElement>("button[aria-current]"),
          );
          const i = cards.indexOf(document.activeElement as HTMLButtonElement);
          const next = cards[i + (e.key === "ArrowRight" ? 1 : -1)];
          next?.focus();
          next?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          (document.activeElement as HTMLElement).blur();
          shellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (e.key === "Enter" || e.key === " ") return;
      }
      switch (e.key) {

        case " ":
        case "Enter":
        case "MediaPlayPause":
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          if (type !== "live") seekBy(10);
          break;
        case "ArrowLeft":
          if (type !== "live") seekBy(-10);
          break;
        case "ArrowUp":
          setMenu((m) => (m ? null : "quality"));
          break;
        case "ArrowDown":
          if (menuOpenRef.current) {
            setMenu(null);
            break;
          }
          if (carouselRef.current) {
            e.preventDefault();
            carouselRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            carouselRef.current.querySelector<HTMLButtonElement>('button[aria-current="true"]')?.focus();
          }
          break;
        case "Backspace":
        case "Escape":
          goBack();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ping, toggle, seekBy, goBack, type, fatalError, retryStream]);

  useEffect(() => {
    menuOpenRef.current = menu !== null;
  }, [menu]);

  const applySpeed = (value: number) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const onSurfaceTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const right = e.clientX - rect.left > rect.width / 2;
    if (now - lastTap.current < 320 && type !== "live") {
      seekBy(right ? 10 : -10);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setShowControls((s) => !s);
    ping();
  };

  const percent = duration ? (current / duration) * 100 : 0;

  const overlay = showControls
    ? "opacity-100"
    : "pointer-events-none opacity-0";

  const showEpisodes = type === "series" && episodes.length > 1;

  return (
    <main
      className={`min-h-screen w-full bg-vexia-bg font-sans text-white ${showEpisodes ? "overflow-y-auto" : "h-screen overflow-hidden"}`}
    >
      <div
        ref={shellRef}
        className={`relative w-full overflow-hidden bg-black ${showEpisodes ? "h-[62vh] min-h-[320px]" : "h-screen"}`}
      >
      {/* ── Superfície do vídeo ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        autoPlay
        playsInline
        muted={muted}
      />
      <div className="absolute inset-0" onClick={onSurfaceTap} role="presentation" />


      {(buffering || reconnecting) && !fatalError && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2
              className="h-12 w-12 animate-spin text-vexia-purple drop-shadow-[0_0_16px_rgba(123,47,190,0.9)]"
              aria-hidden
            />
            {reconnecting ? (
              <span className="text-xs font-semibold text-vexia-cyan">
                Reconectando… ({attempt}/{MAX_RETRIES})
              </span>
            ) : null}

          </div>
        </div>
      )}

      {!src ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/85 text-center">
          <div>
            <p className="text-base font-bold">Nenhum stream disponível para este conteúdo</p>
            <button
              type="button"
              onClick={goBack}
              className="vexia-focus mt-4 rounded-full bg-vexia-purple px-6 py-2 text-xs font-bold"
            >
              VOLTAR
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Erro fatal / recuperação ── */}
      {src && fatalError ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/90 px-6">
          <div className="w-full max-w-md rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f]/95 p-6 text-center shadow-[0_0_40px_rgba(123,47,190,0.35)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#FF1744]/60 bg-[#FF1744]/10">
              <WifiOff className="h-7 w-7 text-[#FF1744]" aria-hidden />
            </div>
            <p className="mt-4 text-base font-bold text-white">Falha na reprodução</p>
            <p className="mt-1 text-sm text-white/70">{fatalError.message}</p>
            <p className="mt-2 text-[11px] text-vexia-cyan/80">
              {attempt > 0 ? `${attempt} tentativa(s) automática(s) realizada(s). ` : ""}
              Verifique sua conexão ou tente novamente.
            </p>
            {fatalError.detail ? (
              <p className="mt-1 truncate text-[10px] text-white/35">{fatalError.detail}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                autoFocus
                onClick={retryStream}
                className="vexia-focus flex items-center gap-2 rounded-full bg-vexia-purple px-6 py-2 text-xs font-bold text-white"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> TENTAR NOVAMENTE
              </button>
              <button
                type="button"
                onClick={goBack}
                className="vexia-focus flex items-center gap-2 rounded-full border border-vexia-cyan/60 px-6 py-2 text-xs font-bold text-vexia-cyan"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> VOLTAR
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {/* ── Retomar reprodução ── */}
      {resumeAsk && savedEntry ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f] p-5 text-center">
            <p className="text-sm font-bold">Continuar de onde parou?</p>
            <p className="mt-1 text-xs text-vexia-cyan">
              {fmt(savedEntry.positionSec)} de {fmt(savedEntry.durationSec)}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = savedEntry.positionSec;
                  setResumeAsk(false);
                }}
                className="vexia-focus rounded-full bg-vexia-purple px-5 py-2 text-xs font-bold"
              >
                CONTINUAR
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                  setResumeAsk(false);
                }}
                className="vexia-focus rounded-full border border-white/20 px-5 py-2 text-xs font-bold"
              >
                DO INÍCIO
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmForget(true)}
              className="vexia-focus mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-vexia-text/60 transition-colors hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> REMOVER DO HISTÓRICO
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmForget}
        title="Remover do histórico?"
        message="O progresso salvo deste conteúdo será apagado e a reprodução começará do início."
        onConfirm={() => {
          clearProgress(progressKey);
          const meta = watchMetaRef.current;
          if (meta?.name) removeWatch(historyKey(meta.kind, meta.name));
          if (videoRef.current) videoRef.current.currentTime = 0;
          setConfirmForget(false);
          setResumeAsk(false);
        }}
        onCancel={() => setConfirmForget(false)}
      />

      {/* ── Topo ── */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/85 to-transparent px-5 py-4 transition-opacity duration-300 md:px-8 ${overlay}`}
      >
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={goBack}
            className="vexia-focus flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-vexia-cyan"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden /> Voltar
          </button>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.18em]">
            {type === "live" ? (
              <span className="flex items-center gap-1.5 text-[#FF1744]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF1744]" /> AO VIVO
              </span>
            ) : (
              <span className="text-vexia-cyan">{kindLabel}</span>
            )}
            <span className="text-vexia-cyan">• {quality === "Auto" ? "1080p" : quality}</span>
            {type === "live" ? (
              <span className="text-vexia-cyan">• atraso {Math.round(liveDelay)}s</span>
            ) : null}
          </div>
          <h1 className="truncate text-base font-medium text-white md:text-lg">
            {title}
            {episode ? ` — S${String(episode.season).padStart(2, "0")}E${String(episode.number).padStart(2, "0")}` : ""}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFav((f) => !f)}
            aria-label="Favoritar"
            aria-pressed={fav}
            className={`vexia-focus grid h-9 w-9 place-items-center rounded-full border ${fav ? "border-vexia-purple" : "border-vexia-cyan/70"}`}
          >
            <Heart
              className={`h-4 w-4 ${fav ? "fill-current text-vexia-purple-soft" : "text-vexia-cyan"}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label="Áudio"
            className="vexia-focus grid h-9 w-9 place-items-center rounded-full"
          >
            {muted ? (
              <VolumeX className="h-5 w-5 text-vexia-cyan" aria-hidden />
            ) : (
              <Volume2 className="h-5 w-5 text-vexia-cyan" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Tela cheia"
            className="vexia-focus grid h-9 w-9 place-items-center rounded-full"
          >
            <Maximize className="h-5 w-5 text-vexia-cyan" aria-hidden />
          </button>
          <VexiaLogo className="h-9" />
        </div>
      </header>

      {/* ── Controles ── */}
      <section
        className={`absolute inset-x-0 bottom-0 z-20 space-y-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-5 pb-6 pt-10 transition-opacity duration-300 md:px-10 ${overlay}`}
      >
        {/* Barra de progresso / atraso */}
        {type === "live" ? (
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="rounded-full bg-[#FF1744]/20 px-3 py-1 font-bold text-[#FF1744]">
              AO VIVO
            </span>
            <span className="text-vexia-cyan">Atraso do stream: {Math.round(liveDelay)} segundos</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={1}
              value={current}
              aria-label="Progresso"
              onChange={(e) => {
                const v = Number(e.target.value);
                if (videoRef.current) videoRef.current.currentTime = v;
                setCurrent(v);
                ping();
              }}
              className="vexia-seek h-1.5 w-full appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, var(--vexia-purple) ${percent}%, rgba(255,255,255,0.2) ${percent}%)`,
              }}
            />
            <div className="flex justify-between text-xs font-normal text-white">
              <span>{fmt(current)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        )}

        {/* Botões de transporte */}
        <div className="flex items-center justify-center gap-6 md:gap-10">
          {type === "series" ? (
            <button
              type="button"
              disabled={!prevEpisode}
              onClick={() =>
                prevEpisode && navigate({ to: "/player", search: { type, id, ep: prevEpisode.id } })
              }
              aria-label="Episódio anterior"
              className="vexia-focus grid h-11 w-11 place-items-center rounded-full disabled:opacity-30"
            >
              <SkipBack className="h-6 w-6 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          {type !== "live" ? (
            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label="Voltar 10 segundos"
              className="vexia-focus grid h-11 w-11 place-items-center rounded-full"
            >
              <Rewind className="h-6 w-6 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="vexia-focus grid h-16 w-16 place-items-center rounded-full bg-vexia-purple shadow-[0_0_28px_-4px_rgba(123,47,190,0.95)]"
          >
            {playing ? (
              <Pause className="h-7 w-7 fill-current text-white" aria-hidden />
            ) : (
              <Play className="h-7 w-7 fill-current text-white" aria-hidden />
            )}
          </button>
          {type !== "live" ? (
            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label="Avançar 10 segundos"
              className="vexia-focus grid h-11 w-11 place-items-center rounded-full"
            >
              <FastForward className="h-6 w-6 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          {type === "series" ? (
            <button
              type="button"
              disabled={!nextEpisode}
              onClick={() =>
                nextEpisode && navigate({ to: "/player", search: { type, id, ep: nextEpisode.id } })
              }
              aria-label="Próximo episódio"
              className="vexia-focus grid h-11 w-11 place-items-center rounded-full disabled:opacity-30"
            >
              <SkipForward className="h-6 w-6 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Informações do conteúdo */}
        <div className="space-y-1 text-xs">
          {type === "series" && episode ? (
            <>
              <p className="font-medium text-vexia-cyan">
                Temporada {episode.season} • Episódio {String(episode.number).padStart(2, "0")} •{" "}
                {episode.title} {duration ? `• ⏱ ${fmt(duration)}` : ""}
              </p>
              {nextEpisode ? (
                <p className="text-vexia-cyan/80">
                  Próximo episódio: Temporada {nextEpisode.season} • Episódio{" "}
                  {String(nextEpisode.number).padStart(2, "0")} • {nextEpisode.title}
                </p>
              ) : null}
            </>
          ) : null}
          {type === "movie" && movie?.overview ? (
            <p className="line-clamp-2 max-w-3xl text-[12px] font-normal text-white/90">
              {movie.overview}
            </p>
          ) : null}
          {type === "live" && channel?.now ? (
            <p className="font-medium text-vexia-cyan">Agora: {channel.now}</p>
          ) : null}
        </div>

        {/* Menu de configurações do player */}
        <div className="flex items-center gap-3">
          {(
            [
              { key: "quality", icon: ChevronsLeftRight, label: quality },
              { key: "audio", icon: Volume2, label: audio.currentLabel },
              { key: "subs", icon: Captions, label: subs.currentLabel },
              { key: "speed", icon: Gauge, label: `${speed}x` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMenu((m) => (m === opt.key ? null : opt.key))}
              className={`vexia-focus flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
                menu === opt.key
                  ? "border-vexia-purple text-vexia-cyan shadow-[0_0_14px_-2px_rgba(123,47,190,0.9)]"
                  : "border-white/15 text-white"
              }`}
            >
              <opt.icon className="h-4 w-4 text-vexia-cyan" aria-hidden />
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMenu("quality")}
            aria-label="Configurações"
            className="vexia-focus grid h-9 w-9 place-items-center rounded-xl border border-white/15"
          >
            <Settings className="h-4 w-4 text-vexia-cyan" aria-hidden />
          </button>
        </div>

        {menu ? (
          <div className="flex flex-wrap gap-2 rounded-2xl border border-vexia-purple/40 bg-black/80 p-3">
            {menuOptions.length === 0 ? (
              <p className="px-2 py-1 text-[11px] font-medium text-white/70">
                {menu === "audio"
                  ? "Este stream não oferece faixas de áudio alternativas."
                  : "Este stream não oferece legendas."}
              </p>
            ) : null}
            {menuOptions.map((opt) => (
              <button
                key={`${menu}-${opt.label}`}
                type="button"
                onClick={() => {
                  opt.select();
                  ping();
                }}
                className={`vexia-focus rounded-full border px-4 py-1.5 text-[11px] font-semibold ${
                  opt.active
                    ? "border-vexia-purple text-vexia-cyan"
                    : "border-white/15 text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}

      </section>
      </div>

      {showEpisodes && serie ? (
        <div ref={carouselRef}>
          <EpisodeCarousel
            seriesId={id}
            seriesTitle={serie.title}
            seriesYear={serie.year || undefined}
            seriesPoster={serie.poster}
            episodes={episodes}
            currentEpisodeId={episode?.id}
            onSelect={(next) => {
              navigate({ to: "/player", search: { type: "series", id, ep: next.id } });
              shellRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      ) : null}
    </main>

  );
}
