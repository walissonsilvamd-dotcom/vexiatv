/**
 * Recursos extras do painel Xtream portados do APK base:
 *
 * - `get_short_epg`    → programação "agora / a seguir" só do canal focado
 *   (muito mais leve que baixar o XMLTV inteiro).
 * - `get_simple_data_table` → grade completa do canal, com a marca de
 *   gravação (`has_archive`) usada para o catch-up / TV em replay.
 * - `/timeshift/...`   → link de reprodução de um programa já exibido, no
 *   mesmo formato que o app base monta.
 */
import { xtreamCreds, type XtreamCreds } from "./xtream-catalog";

export type EpgEntry = {
  id: string;
  title: string;
  description: string;
  /** ms */
  start: number;
  /** ms */
  stop: number;
  /** o painel guarda a gravação deste programa */
  hasArchive: boolean;
};

function apiUrl(creds: XtreamCreds, action: string, extra = "") {
  return `${creds.base}/player_api.php?username=${encodeURIComponent(
    creds.username,
  )}&password=${encodeURIComponent(creds.password)}&action=${action}${extra}`;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/public/playlist?url=${encodeURIComponent(url)}`, { signal });
  if (!res.ok || res.headers.get("X-Playlist-Error") === "1") {
    throw new Error("Painel indisponível.");
  }
  return (await res.json()) as T;
}

/** O painel devolve título/descrição em base64 (com acentos em UTF-8). */
function decode(value: unknown): string {
  const raw = String(value ?? "");
  if (!raw) return "";
  try {
    const bin = atob(raw);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return raw;
  }
}

/** "2026-08-01 21:30:00" (hora do painel) → ms locais. */
function parseStamp(value: unknown, fallbackSeconds: unknown): number {
  const secs = Number(fallbackSeconds);
  if (Number.isFinite(secs) && secs > 0) return secs * 1000;
  const text = String(value ?? "").trim().replace(" ", "T");
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : 0;
}

type RawEpg = {
  id?: string | number;
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  start_timestamp?: string | number;
  stop_timestamp?: string | number;
  has_archive?: string | number;
  now_playing?: number;
};

function mapEntries(list: RawEpg[] | undefined): EpgEntry[] {
  const out: EpgEntry[] = [];
  for (const raw of list ?? []) {
    const start = parseStamp(raw.start, raw.start_timestamp);
    const stop = parseStamp(raw.end, raw.stop_timestamp);
    if (!start || !stop) continue;
    out.push({
      id: String(raw.id ?? `${start}`),
      title: decode(raw.title) || "Programa",
      description: decode(raw.description),
      start,
      stop,
      hasArchive: Number(raw.has_archive) === 1,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Extrai o stream_id de um link de canal Xtream (…/12345.m3u8 ou .ts). */
export function liveStreamId(url: string | undefined | null): string {
  if (!url) return "";
  const clean = url.split("?")[0] ?? "";
  const last = clean.split("/").pop() ?? "";
  const id = last.replace(/\.(m3u8|ts|mp4)$/i, "");
  return /^\d+$/.test(id) ? id : "";
}

const shortCache = new Map<string, { at: number; data: EpgEntry[] }>();
const tableCache = new Map<string, { at: number; data: EpgEntry[] }>();
const TTL = 5 * 60_000;

/** Programação curta (agora + próximos) do canal — chamada por canal focado. */
export async function fetchShortEpg(
  playlistUrl: string,
  streamId: string,
  signal?: AbortSignal,
): Promise<EpgEntry[]> {
  const creds = xtreamCreds(playlistUrl);
  if (!creds || !streamId) return [];
  const key = `${creds.base}|${streamId}`;
  const hit = shortCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const json = await getJson<{ epg_listings?: RawEpg[] }>(
    apiUrl(creds, "get_short_epg", `&stream_id=${streamId}&limit=4`),
    signal,
  );
  const data = mapEntries(json.epg_listings);
  shortCache.set(key, { at: Date.now(), data });
  return data;
}

/** Grade completa do canal — base do catch-up (só o que tem gravação). */
export async function fetchChannelEpgTable(
  playlistUrl: string,
  streamId: string,
  signal?: AbortSignal,
): Promise<EpgEntry[]> {
  const creds = xtreamCreds(playlistUrl);
  if (!creds || !streamId) return [];
  const key = `${creds.base}|${streamId}`;
  const hit = tableCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const json = await getJson<{ epg_listings?: RawEpg[] }>(
    apiUrl(creds, "get_simple_data_table", `&stream_id=${streamId}`),
    signal,
  );
  const data = mapEntries(json.epg_listings);
  tableCache.set(key, { at: Date.now(), data });
  return data;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** `yyyy-MM-dd:HH-mm` — formato exigido pelo endpoint /timeshift do painel. */
function timeshiftStamp(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}:${pad(d.getHours())}-${pad(
    d.getMinutes(),
  )}`;
}

/** Link de reprodução do programa gravado (catch-up). */
export function catchupUrl(
  playlistUrl: string,
  streamId: string,
  program: Pick<EpgEntry, "start" | "stop">,
): string | null {
  const creds = xtreamCreds(playlistUrl);
  if (!creds || !streamId) return null;
  const minutes = Math.max(1, Math.round((program.stop - program.start) / 60_000));
  return `${creds.base}/timeshift/${encodeURIComponent(creds.username)}/${encodeURIComponent(
    creds.password,
  )}/${minutes}/${timeshiftStamp(program.start)}/${streamId}.ts`;
}
