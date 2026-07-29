/// <reference lib="webworker" />
import { buildPlaylist, parseM3U } from "../lib/m3u";

export type ParseWorkerRequest = { text: string };
export type ParseWorkerResponse =
  | { type: "stage"; stage: number; counts?: { channels?: number; movies?: number; series?: number } }
  | { type: "done"; data: ReturnType<typeof buildPlaylist> }
  | { type: "error"; message: string };

const post = (message: ParseWorkerResponse) => (self as unknown as Worker).postMessage(message);

self.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  try {
    post({ type: "stage", stage: 1 });
    const entries = parseM3U(event.data.text);
    post({ type: "stage", stage: 2 });
    const data = buildPlaylist(entries);
    post({ type: "stage", stage: 3 });
    post({ type: "stage", stage: 4, counts: { channels: data.channels.length } });
    post({ type: "stage", stage: 5, counts: { movies: data.movies.length } });
    post({ type: "stage", stage: 6, counts: { series: data.series.length } });
    post({ type: "done", data });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : "Falha ao processar a lista." });
  }
};
