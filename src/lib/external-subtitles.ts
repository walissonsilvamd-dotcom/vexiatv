/**
 * Legendas externas (.srt / .vtt).
 *
 * Recurso do APK base: quando o conteúdo vem sem legenda embutida, o cliente
 * aponta um arquivo local ou uma URL e o player passa a exibir a legenda.
 * Convertemos SRT para WebVTT (o navegador só entende VTT) e anexamos como
 * faixa no <video>. A escolha fica salva por canal/título.
 */

const KEY = "vexia:subs:external";
const LIMIT = 120;

type Store = Record<string, { url: string; label: string }>;

function readStore(): Store {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof localStorage === "undefined") return;
  try {
    const keys = Object.keys(store);
    if (keys.length > LIMIT) for (const k of keys.slice(0, keys.length - LIMIT)) delete store[k];
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* armazenamento indisponível */
  }
}

/** URL de legenda externa salva para este conteúdo (só http/https). */
export function getExternalSubtitle(itemKey: string) {
  return readStore()[itemKey] ?? null;
}

export function setExternalSubtitle(itemKey: string, url: string, label = "Legenda externa") {
  if (!itemKey || !/^https?:\/\//i.test(url)) return;
  const store = readStore();
  store[itemKey] = { url, label };
  writeStore(store);
}

export function clearExternalSubtitle(itemKey: string) {
  const store = readStore();
  delete store[itemKey];
  writeStore(store);
}

/** Converte SRT (ou já-VTT) para WebVTT válido. */
export function srtToVtt(input: string) {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (/^WEBVTT/.test(text.trim())) return text;
  const body = text
    // "00:00:01,500 --> 00:00:03,000" → vírgula vira ponto
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    // Remove os números sequenciais das falas
    .replace(/^\d+\n(?=\d{2}:\d{2}:\d{2}\.)/gm, "");
  return `WEBVTT\n\n${body.trim()}\n`;
}

export type ExternalSubtitleHandle = { remove: () => void };

/** Anexa e liga uma legenda externa no elemento de vídeo. */
export function attachExternalSubtitle(
  video: HTMLVideoElement,
  vttBlobUrl: string,
  label: string,
  lang = "pt",
): ExternalSubtitleHandle {
  const track = document.createElement("track");
  track.kind = "subtitles";
  track.label = label;
  track.srclang = lang;
  track.src = vttBlobUrl;
  track.default = true;
  video.appendChild(track);
  // Algumas TVs só ativam a faixa depois de um tique.
  const enable = () => {
    if (track.track) track.track.mode = "showing";
  };
  track.addEventListener("load", enable);
  setTimeout(enable, 60);
  return {
    remove() {
      track.removeEventListener("load", enable);
      if (track.track) track.track.mode = "disabled";
      track.remove();
    },
  };
}

/** Baixa (ou lê) o texto, converte e devolve uma URL de blob VTT. */
export async function toVttBlobUrl(source: string | File) {
  const raw =
    typeof source === "string"
      ? await fetch(source, { mode: "cors" }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        })
      : await source.text();
  const vtt = srtToVtt(raw);
  return URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
}
