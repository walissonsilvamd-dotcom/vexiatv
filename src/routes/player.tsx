import { matchesLegacyId } from "../utils/hash";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Captions,
  Timer,
  ChevronDown,
  ChevronUp,
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
import {
  SUBS_OFF,
  useAudioTracks,
  useSubtitleTracks,
} from "../hooks/useMediaTracks";

import { AudioTagBadge } from "../components/vexia/AudioTagBadge";
import { ConfirmDialog } from "../components/vexia/ConfirmDialog";

import { EpisodeCarousel } from "../components/vexia/EpisodeCarousel";
import { ExternalPlayerGate } from "../components/vexia/ExternalPlayerGate";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { usePlaylist } from "../lib/playlist-store";
import { useSettings } from "../lib/settings-store";
import {
  getSubtitleOffset,
  getSubtitlePref,
  setSubtitleOffset,
  setSubtitlePref,
  subtitleItemKey,
  clampSubtitleOffset,
  SUBTITLE_OFFSET_STEP,
} from "../lib/subtitle-prefs";
import { createSubtitleOffsetController } from "../lib/subtitle-offset";
import {
  attachExternalSubtitle,
  clearExternalSubtitle,
  getExternalSubtitle,
  setExternalSubtitle,
  toVttBlobUrl,
  type ExternalSubtitleHandle,
} from "../lib/external-subtitles";
import { ExternalSubsDialog } from "../components/vexia/ExternalSubsDialog";
import { playableStreamUrl } from "../lib/stream-url";
import { pickSubtitleTrack } from "../lib/subtitle-match";

import { formatExpiry } from "../lib/xtream";
import { getStreamHandoff, setStreamHandoff } from "../lib/stream-handoff";

import { clearProgress, saveProgress, useProgress } from "../lib/progress-store";
import { saveLastSession } from "../lib/last-session";
import {
  completeWatch,
  historyKey,
  recordWatch,
  removeWatch,
  type WatchKind,
} from "../lib/history-store";

type PlayerSearch = { type: "live" | "movie" | "series"; id: string; ep?: string };

import { useSeriesEpisodes } from "../hooks/useSeriesEpisodes";
import { useResilientPlayer } from "../hooks/useResilientPlayer";

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

function PlayerPage() {
  const { type, id, ep } = Route.useSearch();
  const navigate = useNavigate();
  const { movies, series, channels, expired, account } = usePlaylist();
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTap = useRef(0);
  const watchMetaRef = useRef<{ kind: WatchKind; name: string } | null>(null);

  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [, setBufferingFromMedia] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fav, setFav] = useState(false);
  const [menu, setMenu] = useState<null | "quality" | "audio" | "subs" | "subsDelay" | "speed">(
    null,
  );
  const menuOpenRef = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerOpenRef = useRef(false);
  const [quality, setQuality] = useState("Auto");
  const [speed, setSpeed] = useState(1);
  const [mediaReady, setMediaReady] = useState(false);

  const showEpisodesRef = useRef(false);


  const [liveDelay, setLiveDelay] = useState(0);

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

  const { episodes: serieEpisodes, loading: episodesLoading } = useSeriesEpisodes(serie);
  const episodes = useMemo(
    () => [...serieEpisodes].sort((a, b) => a.season - b.season || a.number - b.number),
    [serieEpisodes],
  );
  const epIndex = Math.max(
    0,
    episodes.findIndex((e) => e.id === ep),
  );
  const episode = episodes[epIndex];
  const nextEpisode = episodes[epIndex + 1];
  const prevEpisode = episodes[epIndex - 1];

  /**
   * Link entregue pela tela anterior no momento do clique. Permite começar a
   * tocar imediatamente, sem esperar a lista de episódios/catálogo carregar.
   */
  const handoffUrl = useMemo(() => getStreamHandoff(type, id, ep), [type, id, ep]);

  // Assinatura vencida: a lista continua salva, mas nada é reproduzido.
  const rawSrc = expired
    ? ""
    : (channel?.url ?? movie?.streamUrl ?? episode?.url ?? handoffUrl ?? "");
  // Links http em página https passam pelo proxy do app (conteúdo misto/CORS).
  const src = useMemo(() => playableStreamUrl(rawSrc), [rawSrc]);

  const resilientPlayer = useResilientPlayer({
    videoRef,
    slotARef,
    slotBRef,
    src,
    live: type === "live",
  });
  const {
    activeSlot,
    hlsApi,
    reconnecting,
    fatalError,
    attempt,
    recoveryCycle,

    retry: retryStream,
    tryOtherEngine,
  } = resilientPlayer;

  const progressKey = type === "series" && episode ? `${id}::${episode.id}` : id;
  const { entryFor } = useProgress(id);
  const savedEntry = entryFor(progressKey);
  const [resumeNotice, setResumeNotice] = useState<number | null>(null);
  /** Posição pendente a aplicar assim que o vídeo tiver metadados. */
  const pendingResumeRef = useRef<number | null>(null);

  const [confirmForget, setConfirmForget] = useState(false);
  const { settings } = useSettings();
  /* Ajustes → Player de Vídeo: "externo" abre o link em outro aplicativo. */
  const [internalOverride, setInternalOverride] = useState(false);
  const externalGate = settings.player === "external" && !internalOverride;

  const title =
    channel?.name ?? movie?.title ?? (serie ? serie.title : "") ?? "Conteúdo indisponível";
  const kindLabel = type === "live" ? "AO VIVO" : type === "movie" ? "FILME" : "SÉRIE";

  useEffect(() => {
    if (resilientPlayer.mutedByAutoplay) setMuted(true);
  }, [resilientPlayer.mutedByAutoplay]);

  /* ── Tela cheia automática ao abrir o player (e a cada troca de episódio) ── */
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const enter = async () => {
      const el = shellRef.current as (HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      }) | null;
      const video = videoRef.current as (HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      }) | null;
      if (cancelled || document.fullscreenElement) return;
      try {
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el?.msRequestFullscreen) await el.msRequestFullscreen();
        else video?.webkitEnterFullscreen?.();
      } catch {
        /* Sem gesto do usuário o navegador bloqueia: seguimos em tela cheia simulada. */
      }
    };
    const id = setTimeout(() => void enter(), 60);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [src]);

  /* ── Sai da tela cheia ao deixar o player ── */
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  /* ── Se o autoplay entrou mudo, religa o som no primeiro gesto ── */
  useEffect(() => {
    if (!resilientPlayer.mutedByAutoplay) return;
    const unmute = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      setMuted(false);
      void video.play().catch(() => undefined);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", unmute);
      window.removeEventListener("keydown", unmute);
    };
    window.addEventListener("pointerdown", unmute, { once: true });
    window.addEventListener("keydown", unmute, { once: true });
    return cleanup;
  }, [resilientPlayer.mutedByAutoplay]);




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
    const onMeta = () => {
      setDuration(video.duration);
      setMediaReady(true);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBufferingFromMedia(true);
    const onPlaying = () => setBufferingFromMedia(false);
    const onEnded = () => {
      if (watchMetaRef.current?.name && type !== "live") {
        completeWatch(watchMetaRef.current.kind, watchMetaRef.current.name);
      }
      if (nextEpisode) {
        setStreamHandoff("series", id, nextEpisode.url, nextEpisode.id);
        navigate({ to: "/player", search: { type, id, ep: nextEpisode.id }, viewTransition: true });
      }
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
  }, [type, id, nextEpisode, navigate, activeSlot]);

  /* ── Retomada automática: agenda a posição salva deste conteúdo/episódio ── */
  useEffect(() => {
    if (type === "live") {
      pendingResumeRef.current = null;
      setResumeNotice(null);
      return;
    }
    const shouldResume =
      savedEntry && savedEntry.percent > 2 && savedEntry.percent < 95 && savedEntry.positionSec > 5;
    pendingResumeRef.current = shouldResume ? savedEntry.positionSec : null;
    setResumeNotice(shouldResume ? savedEntry.positionSec : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey, type]);

  /* ── Aplica a retomada assim que o vídeo ativo tiver metadados ── */
  useEffect(() => {
    if (type === "live") return;
    const video = videoRef.current;
    if (!video) return;

    const apply = () => {
      const target = pendingResumeRef.current;
      if (target == null) return;
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (target >= video.duration - 10) {
        pendingResumeRef.current = null;
        return;
      }
      try {
        video.currentTime = target;
        pendingResumeRef.current = null;
      } catch {
        /* stream ainda sem seek — tenta no próximo evento */
      }
    };

    apply();
    video.addEventListener("loadedmetadata", apply);
    video.addEventListener("canplay", apply);
    return () => {
      video.removeEventListener("loadedmetadata", apply);
      video.removeEventListener("canplay", apply);
    };
  }, [type, progressKey, activeSlot, src]);

  /* ── Aviso discreto de retomada some sozinho ── */
  useEffect(() => {
    if (resumeNotice == null) return;
    const t = window.setTimeout(() => setResumeNotice(null), 7000);
    return () => window.clearTimeout(t);
  }, [resumeNotice]);


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
        saveLastSession({
          type,
          id,
          title: watchMeta.name,
          poster: watchMeta.poster,
          positionSec: 0,
          durationSec: 0,
          percent: 0,
        });
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
      // Última sessão: permite restaurar o episódio ao reabrir o app.
      saveLastSession({
        type,
        id,
        ep: episode?.id,
        title: watchMeta.name,
        episodeLabel: episode
          ? `T${episode.season}E${episode.number}${episode.title ? ` • ${episode.title}` : ""}`
          : undefined,
        poster: watchMeta.poster,
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
            carouselRef.current!.querySelectorAll<HTMLButtonElement>("button[data-episode-card]"),
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
          setDrawerOpen(false);
          // Sobe direto para Qualidade/Áudio/Legenda, sem passar pelo vídeo.
          window.setTimeout(() => {
            controlsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
          }, 60);
          return;
        }
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          (document.activeElement as HTMLElement).blur();
          setDrawerOpen(false);
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
          if (showEpisodesRef.current) {
            e.preventDefault();
            setDrawerOpen(true);
            window.setTimeout(() => {
              carouselRef.current
                ?.querySelector<HTMLButtonElement>('button[data-active="true"]')
                ?.focus();
            }, 260);
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

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  // Troca de episódio recolhe a gaveta para o vídeo ficar em tela cheia.
  useEffect(() => {
    setDrawerOpen(false);
  }, [episode?.id]);

  // Mantém o container do player focável para capturar ArrowDown em WebViews/TV.
  useEffect(() => {
    shellRef.current?.focus({ preventScroll: true });
  }, []);

  // Reflete no handler global a disponibilidade real de episódios (evita closure stale).
  useEffect(() => {
    showEpisodesRef.current = type === "series" && episodes.length > 1;
  }, [type, episodes]);


  const applySpeed = (value: number) => {
    setSpeed(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  /* ── Faixas reais de áudio e legenda (hls.js ou player nativo) ── */
  const audio = useAudioTracks(videoRef.current, hlsApi, mediaReady);
  const subs = useSubtitleTracks(videoRef.current, hlsApi, mediaReady);

  /* ── Preferências de legenda vindas de Ajustes ─────────────────
     Só faz efeito quando a lista carregada realmente traz legendas. */
  const subsAutoRef = useRef<string>("");
  /** Escolha manual feita no player tem prioridade sobre a preferência de Ajustes. */
  const subsManualRef = useRef(false);
  /** Último idioma escolhido à mão — reaplicado ao trocar de item/episódio. */
  const subsLangRef = useRef<string | null>(null);

  /** Identidade do que está tocando: muda ao vir da busca, da lista ou de outro episódio. */
  const itemKey = `${type}|${id}|${episode?.id ?? ""}`;
  /** Chave de memória por canal/título — séries compartilham entre episódios. */
  const prefKey = subtitleItemKey(type, id);

  useEffect(() => {
    subsManualRef.current = false;
  }, [itemKey]);

  useEffect(() => {
    const signature = `${itemKey}|${subs.tracks.map((t) => `${t.id}:${t.lang}`).join(",")}|${settings.subtitlesEnabled}|${settings.language}`;
    if (subsAutoRef.current === signature) return;
    subsAutoRef.current = signature;
    if (subsManualRef.current) return;

    const saved = getSubtitlePref(prefKey);
    const wantsSubs =
      saved === "off"
        ? false
        : Boolean(saved) || settings.subtitlesEnabled || Boolean(subsLangRef.current);
    if (!wantsSubs) {
      if (subs.selected !== SUBS_OFF) subs.select(SUBS_OFF);
      return;
    }
    if (subs.tracks.length === 0) return;

    // Ordem: idioma salvo deste conteúdo → escolha manual recente → Ajustes.
    // Se nenhum existir na lista carregada, o matcher escolhe a melhor alternativa.
    const match = pickSubtitleTrack(subs.tracks, [
      saved === "off" ? null : saved,
      subsLangRef.current,
      settings.language,
    ]);
    if (match && match.id !== subs.selected) subs.select(match.id);
  }, [settings.subtitlesEnabled, settings.language, subs, itemKey, prefKey]);

  /* ── Atraso (sincronia) das legendas, salvo por canal/título ───── */
  const [subsOffset, setSubsOffset] = useState(0);
  const offsetCtlRef = useRef<ReturnType<typeof createSubtitleOffsetController> | null>(null);

  // Ao trocar de conteúdo, recupera o atraso salvo daquele canal/título.
  useEffect(() => {
    setSubsOffset(getSubtitleOffset(prefKey));
  }, [prefKey]);

  // Liga o controlador ao vídeo ativo (troca junto no failover).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaReady) return;
    const ctl = createSubtitleOffsetController(video);
    offsetCtlRef.current = ctl;
    ctl.setOffset(subsOffset);
    return () => {
      ctl.destroy();
      if (offsetCtlRef.current === ctl) offsetCtlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef.current, mediaReady]);

  useEffect(() => {
    offsetCtlRef.current?.setOffset(subsOffset);
  }, [subsOffset, subs.selected]);

  const applySubsOffset = (value: number) => {
    const next = clampSubtitleOffset(value);
    setSubsOffset(next);
    setSubtitleOffset(prefKey, next);
  };

  /* ── Legenda externa (.srt/.vtt) por arquivo ou link ───────────── */
  const [extSubsOpen, setExtSubsOpen] = useState(false);
  const [extSubsUrl, setExtSubsUrl] = useState<string | null>(null);
  const extHandleRef = useRef<ExternalSubtitleHandle | null>(null);
  const extBlobRef = useRef<string | null>(null);

  /** Anexa a legenda externa ao vídeo ativo. Devolve mensagem de erro ou null. */
  const useExternalSubtitle = useCallback(
    async (source: string | File) => {
      const video = videoRef.current;
      if (!video) return "Player ainda carregando, tente de novo.";
      try {
        const blobUrl = await toVttBlobUrl(source);
        extHandleRef.current?.remove();
        if (extBlobRef.current) URL.revokeObjectURL(extBlobRef.current);
        extBlobRef.current = blobUrl;
        extHandleRef.current = attachExternalSubtitle(
          video,
          blobUrl,
          typeof source === "string" ? "Legenda externa" : source.name,
        );
        setExtSubsUrl(typeof source === "string" ? source : source.name);
        if (typeof source === "string") setExternalSubtitle(prefKey, source);
        offsetCtlRef.current?.refresh();
        return null;
      } catch {
        return "Não foi possível ler essa legenda (verifique o link ou o arquivo).";
      }
    },
    [prefKey],
  );

  const dropExternalSubtitle = useCallback(() => {
    extHandleRef.current?.remove();
    extHandleRef.current = null;
    if (extBlobRef.current) URL.revokeObjectURL(extBlobRef.current);
    extBlobRef.current = null;
    setExtSubsUrl(null);
    clearExternalSubtitle(prefKey);
  }, [prefKey]);

  // Ao abrir um conteúdo que já tinha legenda externa por link, reanexa sozinho.
  useEffect(() => {
    if (!mediaReady) return;
    const saved = getExternalSubtitle(prefKey);
    if (!saved) return;
    void useExternalSubtitle(saved.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefKey, mediaReady]);

  // Limpa o blob ao sair da tela.
  useEffect(
    () => () => {
      extHandleRef.current?.remove();
      if (extBlobRef.current) URL.revokeObjectURL(extBlobRef.current);
    },
    [],
  );


  /* Ao voltar pelo histórico (bfcache), reaplica faixa, estilo e atraso. */
  useEffect(() => {
    const restore = () => {
      subsAutoRef.current = "";
      subsManualRef.current = false;
      setSubsOffset(getSubtitleOffset(prefKey));
      offsetCtlRef.current?.refresh();
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [prefKey]);


  const subsClass = `vexia-subs vexia-subs-${
    settings.subtitleSize === "small" ? "sm" : settings.subtitleSize === "large" ? "lg" : "md"
  } vexia-subs-${settings.subtitleColor}`;


  type MenuOption = { label: string; active: boolean; select: () => void };
  const menuOptions: MenuOption[] = useMemo(() => {
    if (menu === "quality") {
      return QUALITIES.map((q) => ({ label: q, active: q === quality, select: () => setQuality(q) }));
    }
    if (menu === "speed") {
      return SPEEDS.map((s) => ({
        label: `${s}x`,
        active: s === speed,
        select: () => applySpeed(s),
      }));
    }
    if (menu === "audio") {
      return audio.tracks.map((t) => ({
        label: t.label,
        active: t.id === audio.selected,
        select: () => audio.select(t.id),
      }));
    }
    if (menu === "subs") {
      return [
        {
          label: "Desligada",
          active: subs.selected === SUBS_OFF,
          select: () => {
            subsManualRef.current = true;
            subsLangRef.current = null;
            setSubtitlePref(prefKey, "off");
            subs.select(SUBS_OFF);
          },
        },
        ...subs.tracks.map((t) => ({
          label: t.lang ? `${t.label} · ${t.lang.toUpperCase()}` : t.label,
          active: t.id === subs.selected,
          select: () => {
            subsManualRef.current = true;
            subsLangRef.current = t.lang || null;
            if (t.lang) setSubtitlePref(prefKey, t.lang);
            subs.select(t.id);
          },
        })),
        {
          label: extSubsUrl ? "Legenda externa (trocar)" : "Carregar legenda externa…",
          active: Boolean(extSubsUrl),
          select: () => {
            setMenu(null);
            setExtSubsOpen(true);
          },
        },
      ];
    }


    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, quality, speed, audio.tracks, audio.selected, subs.tracks, subs.selected, prefKey, subsOffset, extSubsUrl]);


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

  /* Callback estável: mantém o carrossel memoizado fora do ciclo de re-render. */
  const selectEpisode = useCallback(
    (next: { id: string; url: string }) => {
      setStreamHandoff("series", id, next.url, next.id);
      void navigate({
        to: "/player",
        search: { type: "series", id, ep: next.id },
        viewTransition: true,
      });
      setDrawerOpen(false);
    },
    [id, navigate],
  );

  const showEpisodes = type === "series" && episodes.length > 1;

  // Com a gaveta aberta os controles continuam visíveis e clicáveis na hora.
  const overlay =
    showControls || drawerOpen || menu ? "opacity-100" : "pointer-events-none opacity-0";

  return (
    <main
      ref={shellRef}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (showEpisodes && (e.key === "ArrowDown" || e.key === "Down")) {
          e.preventDefault();
          setDrawerOpen(true);
          window.setTimeout(() => {
            carouselRef.current
              ?.querySelector<HTMLButtonElement>('button[data-active="true"]')
              ?.focus();
          }, 260);
        }
      }}
      className="h-screen w-full overflow-hidden bg-black font-sans text-white focus:outline-none"
    >
      {/* Player centralizado e discreto — ocupa até 90% da largura e 78% da altura. */}
      <div className="relative mx-auto flex h-full w-full max-w-[95vw] items-center justify-center px-4 py-5">
        <div className="relative w-full max-w-[1600px] rounded-xl bg-black shadow-[0_0_60px_-20px_rgb(var(--vexia-primary-rgb)/0.35)] ring-1 ring-white/10">
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {externalGate && (
              <ExternalPlayerGate
                src={src}
                title={title}
                onUseInternal={() => setInternalOverride(true)}
              />
            )}
            {/* ── Superfície do vídeo: duas instâncias (ativa + reserva quente) ── */}
            <video
              ref={slotARef}
              className={`absolute inset-0 h-full w-full bg-black object-contain ${subsClass} ${
                activeSlot === "a" ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              playsInline
              muted={activeSlot === "a" ? muted : true}
            />
            <video
              ref={slotBRef}
              className={`absolute inset-0 h-full w-full bg-black object-contain ${subsClass} ${
                activeSlot === "b" ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              playsInline
              muted={activeSlot === "b" ? muted : true}
            />

            <div className="absolute inset-0" onClick={onSurfaceTap} role="presentation" />


      {/* ── Assinatura vencida: conteúdo bloqueado até a renovação ── */}
      {expired ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/92 px-6 text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-black tracking-[0.12em] text-vexia-gold">
              ASSINATURA VENCIDA
            </h2>
            <p className="mt-3 text-sm text-white/75">
              Sua lista expirou em {formatExpiry(account)}. Renove com seu provedor para voltar a
              assistir — sua lista continua salva no aparelho.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/listas" })}
              className="vexia-focus mt-6 rounded-full bg-vexia-purple px-8 py-3 text-xs font-bold tracking-[0.16em]"
            >
              GERENCIAR LISTAS
            </button>
          </div>
        </div>
      ) : null}




      {/* Aviso discreto de reconexão (sem spinner cobrindo o filme). */}
      {reconnecting && !fatalError && (
        <div className="pointer-events-none absolute left-5 top-20 z-30 rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-vexia-cyan">
          {recoveryCycle > 0 ? "RECONECTANDO…" : "TROCANDO MOTOR…"}
        </div>
      )}

      {!src && !expired ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/85 text-center">
          <div>
            {type === "series" && episodesLoading ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-vexia-cyan" aria-hidden />
                <p className="mt-3 text-base font-bold">Carregando episódios…</p>
              </>
            ) : (
              <p className="text-base font-bold">Nenhum stream disponível para este conteúdo</p>
            )}
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
          <div className="w-full max-w-md rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f]/95 p-6 text-center shadow-[0_0_40px_rgb(var(--vexia-primary-rgb)/0.35)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#FF1744]/60 bg-[#FF1744]/10">
              <WifiOff className="h-7 w-7 text-[#FF1744]" aria-hidden />
            </div>
            <p className="mt-4 text-base font-bold text-white">Falha na reprodução</p>
            <p className="mt-1 text-sm text-white/70">{fatalError.message}</p>
            <p className="mt-2 text-[11px] text-vexia-cyan/80">
              {attempt > 0 ? `${attempt} tentativa(s) automática(s) realizada(s). ` : ""}
              Os motores HLS, MPEG-TS e nativo já foram testados automaticamente.
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
              <button
                type="button"
                onClick={tryOtherEngine}
                className="vexia-focus flex items-center gap-2 rounded-full border border-white/25 px-6 py-2 text-xs font-bold text-white"
              >
                TROCAR PLAYER
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {/* ── Aviso de retomada automática ── */}
      {resumeNotice != null ? (
        <div className="absolute bottom-28 left-1/2 z-30 -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-full border border-vexia-purple/50 bg-[#0b0b0f]/95 px-4 py-2 shadow-[0_0_24px_rgb(var(--vexia-primary-rgb)/0.45)]">
            <span className="text-[11px] font-bold text-vexia-cyan">
              Retomando de {fmt(resumeNotice)}
            </span>
            <button
              type="button"
              onClick={() => {
                pendingResumeRef.current = null;
                if (videoRef.current) videoRef.current.currentTime = 0;
                setResumeNotice(null);
              }}
              className="vexia-focus rounded-full bg-vexia-purple px-3 py-1 text-[10px] font-bold text-white"
            >
              DO INÍCIO
            </button>
            <button
              type="button"
              onClick={() => setConfirmForget(true)}
              className="vexia-focus rounded-full px-2 py-1 text-vexia-text/60 transition-colors hover:text-red-400"
              aria-label="Remover do histórico"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
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
          pendingResumeRef.current = null;
          if (videoRef.current) videoRef.current.currentTime = 0;
          setConfirmForget(false);
          setResumeNotice(null);
        }}

        onCancel={() => setConfirmForget(false)}
      />

      {/* ── Topo ── */}
      <header
        onPointerMove={ping}
        onPointerDown={ping}
        onClickCapture={ping}
        onFocusCapture={ping}
        className={`absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-gradient-to-b from-black/85 to-transparent px-4 py-2 transition-opacity duration-300 md:px-6 ${overlay}`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goBack}
            className="vexia-focus flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-vexia-cyan"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden /> Voltar
          </button>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.16em]">
            {type === "live" ? (
              <span className="flex items-center gap-1 text-[#FF1744]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF1744]" /> AO VIVO
              </span>
            ) : (
              <span className="text-vexia-cyan">{kindLabel}</span>
            )}
            <span className="text-vexia-cyan">• {quality === "Auto" ? "1080p" : quality}</span>
            {type === "live" ? (
              <span className="text-vexia-cyan">• atraso {Math.round(liveDelay)}s</span>
            ) : null}
          </div>
          <h1 className="flex min-w-0 items-center justify-center gap-2 text-sm font-medium text-white md:text-base">
            <span className="truncate">
              {title}
              {episode ? ` — S${String(episode.season).padStart(2, "0")}E${String(episode.number).padStart(2, "0")}` : ""}
            </span>
            <AudioTagBadge
              sources={[
                episode?.title,
                episode?.url,
                title,
                movie?.category,
                serie?.category,
                channel?.group,
              ]}
            />
          </h1>

        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFav((f) => !f)}
            aria-label="Favoritar"
            aria-pressed={fav}
            className={`vexia-focus grid h-7 w-7 place-items-center rounded-full border ${fav ? "border-vexia-purple" : "border-vexia-cyan/70"}`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${fav ? "fill-current text-vexia-purple-soft" : "text-vexia-cyan"}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label="Áudio"
            className="vexia-focus grid h-7 w-7 place-items-center rounded-full"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-vexia-cyan" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4 text-vexia-cyan" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Tela cheia"
            className="vexia-focus grid h-7 w-7 place-items-center rounded-full"
          >
            <Maximize className="h-4 w-4 text-vexia-cyan" aria-hidden />
          </button>
          <VexiaLogo className="h-7" />
        </div>
      </header>


      {/* ── Controles ── */}
      <section
        onPointerMove={ping}
        onPointerDown={ping}
        onClickCapture={ping}
        onFocusCapture={ping}
        className={`absolute inset-x-0 bottom-0 z-40 space-y-1 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pt-3 pb-3 transition-opacity duration-200 md:px-6 ${overlay}`}
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
        <div className="flex items-center justify-center gap-3 md:gap-5">
          {type === "series" ? (
            <button
              type="button"
              disabled={!prevEpisode}
              onClick={() =>
                prevEpisode &&
                (setStreamHandoff("series", id, prevEpisode.url, prevEpisode.id),
                navigate({ to: "/player", search: { type, id, ep: prevEpisode.id }, viewTransition: true }))
              }
              aria-label="Episódio anterior"
              className="vexia-focus grid h-7 w-7 place-items-center rounded-full disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          {type !== "live" ? (
            <button
              type="button"
              onClick={() => seekBy(-10)}
              aria-label="Voltar 10 segundos"
              className="vexia-focus grid h-7 w-7 place-items-center rounded-full"
            >
              <Rewind className="h-4 w-4 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            className="vexia-focus grid h-9 w-9 place-items-center rounded-full bg-vexia-purple shadow-[0_0_18px_-4px_rgb(var(--vexia-primary-rgb)/0.95)]"
          >
            {playing ? (
              <Pause className="h-4 w-4 fill-current text-white" aria-hidden />
            ) : (
              <Play className="h-4 w-4 fill-current text-white" aria-hidden />
            )}
          </button>
          {type !== "live" ? (
            <button
              type="button"
              onClick={() => seekBy(10)}
              aria-label="Avançar 10 segundos"
              className="vexia-focus grid h-7 w-7 place-items-center rounded-full"
            >
              <FastForward className="h-4 w-4 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
          {type === "series" ? (
            <button
              type="button"
              disabled={!nextEpisode}
              onClick={() =>
                nextEpisode &&
                (setStreamHandoff("series", id, nextEpisode.url, nextEpisode.id),
                navigate({ to: "/player", search: { type, id, ep: nextEpisode.id }, viewTransition: true }))
              }
              aria-label="Próximo episódio"
              className="vexia-focus grid h-7 w-7 place-items-center rounded-full disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4 text-vexia-cyan" aria-hidden />
            </button>
          ) : null}
        </div>




        {/* Menu de configurações do player */}
        <div ref={controlsRef} className="relative z-10 flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "quality", icon: ChevronsLeftRight, title: "Qualidade", label: quality },
              { key: "audio", icon: Volume2, title: "Áudio", label: audio.currentLabel },
              {
                key: "subs",
                icon: Captions,
                title: subs.tracks.length > 1 ? `Legenda · ${subs.tracks.length} idiomas` : "Legenda",
                label: subs.currentLabel,
              },
              { key: "speed", icon: Gauge, title: "Velocidade", label: `${speed}x` },
            ] as const
          ).map((opt) => {
            const open = menu === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMenu((m) => (m === opt.key ? null : opt.key))}
                aria-pressed={open}
                className={`vexia-focus group grid min-w-0 max-w-[130px] grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded-lg border px-2 py-1 text-left transition-all duration-200 focus-visible:border-vexia-cyan focus-visible:bg-vexia-purple/25 focus-visible:shadow-[0_0_0_2px_rgb(var(--vexia-secondary-rgb)/0.55),0_0_18px_-4px_rgb(var(--vexia-secondary-rgb)/0.9)] focus-visible:outline-none ${
                  open
                    ? "border-vexia-purple bg-vexia-purple/25 shadow-[0_0_16px_-4px_rgb(var(--vexia-primary-rgb)/0.95)]"
                    : "border-white/10 bg-white/[0.06] hover:border-vexia-cyan/40 hover:bg-white/[0.12]"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors ${
                    open ? "bg-vexia-purple text-white" : "bg-black/50 text-vexia-cyan"
                  }`}
                >
                  <opt.icon className="h-3 w-3" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[8px] font-bold uppercase tracking-[0.14em] text-white/45">
                    {opt.title}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-white">
                    {opt.label}
                  </span>
                </span>
              </button>
            );
          })}
          {/* Atraso da legenda: só − e +, sem poluir a tela */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-1.5 py-0.5">
            <Timer className="h-3 w-3 shrink-0 text-vexia-cyan" aria-hidden />
            <button
              type="button"
              aria-label="Adiantar legenda"
              onClick={() => applySubsOffset(clampSubtitleOffset(subsOffset - SUBTITLE_OFFSET_STEP))}
              className="vexia-focus grid h-5 w-5 place-items-center rounded-md bg-black/50 text-xs font-black text-vexia-cyan"
            >
              −
            </button>
            <span className="min-w-[36px] text-center text-[10px] font-bold tabular-nums text-white">
              {subsOffset === 0
                ? "0s"
                : `${subsOffset > 0 ? "+" : ""}${subsOffset.toFixed(2).replace(/\.?0+$/, "")}s`}
            </span>
            <button
              type="button"
              aria-label="Atrasar legenda"
              onClick={() => applySubsOffset(clampSubtitleOffset(subsOffset + SUBTITLE_OFFSET_STEP))}
              className="vexia-focus grid h-5 w-5 place-items-center rounded-md bg-black/50 text-xs font-black text-vexia-cyan"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMenu((m) => (m ? null : "quality"))}
            aria-label="Configurações"
            className="vexia-focus grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] transition-colors hover:border-vexia-cyan/40 hover:bg-white/[0.12] focus-visible:border-vexia-cyan focus-visible:shadow-[0_0_0_2px_rgb(var(--vexia-secondary-rgb)/0.55)] focus-visible:outline-none"
          >
            <Settings className="h-3.5 w-3.5 text-vexia-cyan" aria-hidden />
          </button>
        </div>


        {menu ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-vexia-purple/40 bg-black/85 p-2 shadow-[0_0_22px_-8px_rgb(var(--vexia-primary-rgb)/0.9)]">
            {menuOptions.length === 0 ? (
              <p className="px-2 py-1 text-[10px] font-medium text-white/70">
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
                className={`vexia-focus rounded-full border px-3 py-1 text-[10px] font-semibold transition-all ${
                  opt.active
                    ? "border-vexia-purple bg-vexia-purple/25 text-vexia-cyan shadow-[0_0_12px_-3px_rgb(var(--vexia-secondary-rgb)/0.8)]"
                    : "border-white/12 bg-white/[0.05] text-white hover:border-vexia-cyan/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}


      {/* Carrossel de episódios dentro do player, não da tela */}
      {showEpisodes && serie ? (
        <div className="relative w-full rounded-t-lg border-t border-white/10 bg-black/85 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="vexia-focus flex w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold tracking-[0.2em] text-vexia-cyan"
          >
            <span className="h-1 w-16 rounded-full bg-vexia-purple/80 shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.9)]" />
            {drawerOpen ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden />
                FECHAR EPISÓDIOS
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden />
                EPISÓDIOS
              </>
            )}
          </button>
          <div
            ref={carouselRef}
            className={`overflow-y-auto transition-[max-height,padding] duration-300 vexia-scroll ${
              drawerOpen ? "max-h-[35vh] py-3" : "max-h-0 py-0"
            }`}
            aria-hidden={!drawerOpen}
          >
            <EpisodeCarousel
              seriesId={id}
              seriesTitle={serie.title}
              seriesYear={serie.year || undefined}
              seriesPoster={serie.poster}
              episodes={episodes}
              currentEpisodeId={episode?.id}
              onSelect={selectEpisode}
            />
          </div>
        </div>
      ) : null}

      </section>

      <ExternalSubsDialog
        open={extSubsOpen}
        onClose={() => setExtSubsOpen(false)}
        onPick={useExternalSubtitle}
        onClear={dropExternalSubtitle}
        current={extSubsUrl}
      />


      </div>
      </div>


      </div>
    </main>




  );
}
