/**
 * Guia de programação (EPG) no padrão XMLTV.
 *
 * A leitura é opcional: se a lista não fornecer guia, tudo no app continua
 * funcionando exatamente como antes — só não aparece "no ar agora".
 */

export type EpgProgram = {
  channelId: string;
  title: string;
  description: string;
  start: number;
  stop: number;
};

export type EpgGuide = {
  /** Programas por tvg-id, já ordenados por horário. */
  byChannel: Record<string, EpgProgram[]>;
  fetchedAt: number;
};

const CACHE_KEY = "vexia:epg";
/** O guia é revalidado a cada 3 horas. */
export const EPG_TTL_MS = 3 * 60 * 60 * 1000;

/** Descobre a URL do XMLTV a partir de um link Xtream (xmltv.php). */
export function epgUrlFromPlaylist(playlistUrl: string): string | null {
  try {
    const u = new URL(playlistUrl);
    const username = u.searchParams.get("username");
    if (!username) return null;
    const password = u.searchParams.get("password") ?? "";
    return `${u.protocol}//${u.host}/xmltv.php?username=${encodeURIComponent(
      username,
    )}&password=${encodeURIComponent(password)}`;
  } catch {
    return null;
  }
}

/** Converte "20260731143000 -0300" em epoch ms. */
export function parseXmltvDate(value: string): number {
  const m = value
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi, s, tz] = m;
  const base = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0));
  if (!tz) return base;
  const sign = tz[0] === "-" ? -1 : 1;
  const offset = (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(3, 5))) * 60_000;
  return base - sign * offset;
}

function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const PROGRAMME_RE =
  /<programme\b[^>]*start="([^"]+)"[^>]*stop="([^"]+)"[^>]*channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/gi;
const ALT_PROGRAMME_RE =
  /<programme\b[^>]*channel="([^"]+)"[^>]*start="([^"]+)"[^>]*stop="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const DESC_RE = /<desc[^>]*>([\s\S]*?)<\/desc>/i;

function inner(block: string, re: RegExp) {
  const m = block.match(re);
  return m ? decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
}

/** Lê um XMLTV inteiro sem DOMParser (funciona nas TVs mais antigas). */
export function parseXmltv(xml: string): EpgGuide {
  const byChannel: Record<string, EpgProgram[]> = {};

  const collect = (channelId: string, start: string, stop: string, block: string) => {
    const startMs = parseXmltvDate(start);
    const stopMs = parseXmltvDate(stop);
    if (!Number.isFinite(startMs) || !Number.isFinite(stopMs)) return;
    const program: EpgProgram = {
      channelId,
      title: inner(block, TITLE_RE) || "Programação",
      description: inner(block, DESC_RE),
      start: startMs,
      stop: stopMs,
    };
    (byChannel[channelId] ||= []).push(program);
  };

  let match: RegExpExecArray | null;
  while ((match = PROGRAMME_RE.exec(xml))) collect(match[3], match[1], match[2], match[4]);
  if (Object.keys(byChannel).length === 0) {
    while ((match = ALT_PROGRAMME_RE.exec(xml))) collect(match[1], match[2], match[3], match[4]);
  }

  for (const list of Object.values(byChannel)) list.sort((a, b) => a.start - b.start);
  return { byChannel, fetchedAt: Date.now() };
}

/** Programa atual e próximo de um canal. */
export function nowAndNext(guide: EpgGuide | null, tvgId: string | undefined, at = Date.now()) {
  if (!guide || !tvgId) return { now: null, next: null } as const;
  const list = guide.byChannel[tvgId];
  if (!list?.length) return { now: null, next: null } as const;
  const index = list.findIndex((p) => at >= p.start && at < p.stop);
  if (index === -1) {
    const upcoming = list.find((p) => p.start > at) ?? null;
    return { now: null, next: upcoming } as const;
  }
  return { now: list[index], next: list[index + 1] ?? null } as const;
}

/** Percentual já decorrido do programa atual (0..1). */
export function programProgress(program: EpgProgram, at = Date.now()) {
  const span = program.stop - program.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (at - program.start) / span));
}

export function readEpgCache(): EpgGuide | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const guide = JSON.parse(raw) as EpgGuide;
    if (!guide?.byChannel || Date.now() - guide.fetchedAt > EPG_TTL_MS) return null;
    return guide;
  } catch {
    return null;
  }
}

export function writeEpgCache(guide: EpgGuide) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(guide));
  } catch {
    /* guia grande demais para o armazenamento: segue só em memória */
  }
}

/** Baixa e organiza o guia pelo proxy do app (evita bloqueio de CORS). */
export async function fetchEpg(epgUrl: string, signal?: AbortSignal): Promise<EpgGuide | null> {
  try {
    const res = await fetch(`/api/public/playlist?url=${encodeURIComponent(epgUrl)}`, { signal });
    if (!res.ok || res.headers.get("X-Playlist-Error") === "1") return null;
    const xml = await res.text();
    if (!xml.includes("<programme")) return null;
    return parseXmltv(xml);
  } catch {
    return null;
  }
}
