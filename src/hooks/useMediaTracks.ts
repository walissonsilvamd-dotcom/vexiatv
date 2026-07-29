import { useCallback, useEffect, useState } from "react";

/**
 * Detecção e troca de faixas reais de áudio e legenda.
 *
 * Funciona com hls.js (faixas do manifesto) e com o player nativo
 * (audioTracks / textTracks do elemento <video>), que é o caminho usado
 * em muitas Smart TVs com HLS nativo.
 */

export type Track = { id: number; label: string; lang: string };

const AUDIO_PREF_KEY = "vexia:player:audio";
const SUBS_PREF_KEY = "vexia:player:subs";

const LANG_NAMES: Record<string, string> = {
  pt: "Português",
  "pt-br": "Português",
  por: "Português",
  bra: "Português",
  en: "Inglês",
  eng: "Inglês",
  es: "Espanhol",
  spa: "Espanhol",
  la: "Espanhol (LAT)",
  fr: "Francês",
  fra: "Francês",
  it: "Italiano",
  ita: "Italiano",
  de: "Alemão",
  deu: "Alemão",
  ja: "Japonês",
  jpn: "Japonês",
};

export function prettyLang(lang?: string, fallback = "") {
  if (!lang) return fallback;
  const key = lang.toLowerCase();
  return LANG_NAMES[key] ?? LANG_NAMES[key.split("-")[0]] ?? lang.toUpperCase();
}

function readPref(key: string) {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignora cota/modo privado */
  }
}

/** Instância mínima do hls.js que precisamos conhecer. */
export type HlsLike = {
  audioTracks?: { id?: number; name?: string; lang?: string }[];
  audioTrack?: number;
  subtitleTracks?: { id?: number; name?: string; lang?: string }[];
  subtitleTrack?: number;
  subtitleDisplay?: boolean;
  on?: (event: string, cb: () => void) => void;
  off?: (event: string, cb: () => void) => void;
};

/* ─────────────── Áudio ─────────────── */

export function useAudioTracks(
  video: HTMLVideoElement | null,
  hls: HlsLike | null,
  ready: boolean,
) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<number>(-1);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const collect = () => {
      if (cancelled) return;
      if (hls?.audioTracks?.length) {
        const list = hls.audioTracks.map((t, i) => ({
          id: t.id ?? i,
          lang: t.lang ?? "",
          label: t.name?.trim() || prettyLang(t.lang, `Faixa ${i + 1}`),
        }));
        setTracks(list);
        setSelected(hls.audioTrack ?? list[0]?.id ?? -1);
        return;
      }
      const native = (video as unknown as { audioTracks?: ArrayLike<{ language?: string; label?: string; enabled?: boolean }> } | null)
        ?.audioTracks;
      if (native?.length) {
        const list: Track[] = [];
        let active = -1;
        for (let i = 0; i < native.length; i++) {
          const t = native[i];
          list.push({ id: i, lang: t.language ?? "", label: t.label?.trim() || prettyLang(t.language, `Faixa ${i + 1}`) });
          if (t.enabled) active = i;
        }
        setTracks(list);
        setSelected(active === -1 ? 0 : active);
        return;
      }
      setTracks([]);
    };

    collect();
    const timer = setInterval(collect, 1200);
    const stop = setTimeout(() => clearInterval(timer), 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [video, hls, ready]);

  const select = useCallback(
    (id: number) => {
      setSelected(id);
      const track = tracks.find((t) => t.id === id);
      if (track) writePref(AUDIO_PREF_KEY, track.lang || track.label);
      if (hls && hls.audioTracks?.length) {
        hls.audioTrack = id;
        return;
      }
      const native = (video as unknown as { audioTracks?: ArrayLike<{ enabled?: boolean }> } | null)?.audioTracks;
      if (native) {
        for (let i = 0; i < native.length; i++) {
          (native[i] as { enabled?: boolean }).enabled = i === id;
        }
      }
    },
    [hls, video, tracks],
  );

  /* Aplica automaticamente a última escolha do usuário. */
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (applied || tracks.length === 0) return;
    const pref = readPref(AUDIO_PREF_KEY);
    if (pref) {
      const match = tracks.find((t) => t.lang === pref || t.label === pref);
      if (match && match.id !== selected) select(match.id);
    }
    setApplied(true);
  }, [tracks, applied, selected, select]);

  useEffect(() => setApplied(false), [video]);

  const currentLabel =
    tracks.find((t) => t.id === selected)?.label ?? (tracks.length ? tracks[0].label : "Original");

  return { tracks, selected, select, currentLabel };
}

/* ─────────────── Legendas ─────────────── */

export const SUBS_OFF = -1;

export function useSubtitleTracks(
  video: HTMLVideoElement | null,
  hls: HlsLike | null,
  ready: boolean,
) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<number>(SUBS_OFF);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    const collect = () => {
      if (cancelled) return;
      if (hls?.subtitleTracks?.length) {
        setTracks(
          hls.subtitleTracks.map((t, i) => ({
            id: t.id ?? i,
            lang: t.lang ?? "",
            label: t.name?.trim() || prettyLang(t.lang, `Legenda ${i + 1}`),
          })),
        );
        return;
      }
      const native = video?.textTracks;
      if (native?.length) {
        const list: Track[] = [];
        for (let i = 0; i < native.length; i++) {
          const t = native[i];
          if (t.kind !== "subtitles" && t.kind !== "captions") continue;
          list.push({ id: i, lang: t.language ?? "", label: t.label?.trim() || prettyLang(t.language, `Legenda ${i + 1}`) });
        }
        setTracks(list);
        return;
      }
      setTracks([]);
    };

    collect();
    const timer = setInterval(collect, 1200);
    const stop = setTimeout(() => clearInterval(timer), 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [video, hls, ready]);

  const select = useCallback(
    (id: number) => {
      setSelected(id);
      const track = tracks.find((t) => t.id === id);
      writePref(SUBS_PREF_KEY, id === SUBS_OFF ? "off" : track?.lang || track?.label || "off");

      if (hls && hls.subtitleTracks?.length) {
        hls.subtitleDisplay = id !== SUBS_OFF;
        hls.subtitleTrack = id;
        return;
      }
      const native = video?.textTracks;
      if (native) {
        for (let i = 0; i < native.length; i++) {
          native[i].mode = i === id ? "showing" : "disabled";
        }
      }
    },
    [hls, video, tracks],
  );

  const [applied, setApplied] = useState(false);
  useEffect(() => {
    if (applied || tracks.length === 0) return;
    const pref = readPref(SUBS_PREF_KEY);
    if (pref && pref !== "off") {
      const match = tracks.find((t) => t.lang === pref || t.label === pref);
      if (match) select(match.id);
    }
    setApplied(true);
  }, [tracks, applied, select]);

  useEffect(() => setApplied(false), [video]);

  const currentLabel =
    selected === SUBS_OFF
      ? "Desligada"
      : (tracks.find((t) => t.id === selected)?.label ?? "Desligada");

  return { tracks, selected, select, currentLabel };
}
