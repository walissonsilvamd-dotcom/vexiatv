/// <reference lib="webworker" />
import { buildPlaylist, parseM3U } from "../lib/m3u";

/**
 * Protocolo do worker:
 *  - { type: "chunk", text }  → pedaço do download (streaming, economiza memória
 *                               na thread principal em listas de 100 MB+)
 *  - { type: "end" }          → processa tudo que foi recebido
 *  - { text }                 → modo simples (lista já em memória)
 */
export type ParseWorkerRequest =
  | { type: "chunk"; text: string }
  | { type: "end" }
  | { text: string };

export type ParseWorkerResponse =
  | { type: "stage"; stage: number; counts?: { channels?: number; movies?: number; series?: number } }
  /** Progresso real dentro da etapa atual (0..1). */
  | { type: "progress"; stage: number; ratio: number }
  | { type: "done"; data: ReturnType<typeof buildPlaylist> }
  | { type: "error"; message: string };

const post = (message: ParseWorkerResponse) => (self as unknown as Worker).postMessage(message);

let chunks: string[] = [];

function run(text: string) {
  try {
    post({ type: "stage", stage: 1 });
    const entries = parseM3U(text, (ratio) => post({ type: "progress", stage: 1, ratio }));
    post({ type: "stage", stage: 2 });
    const data = buildPlaylist(entries, (ratio) => post({ type: "progress", stage: 2, ratio }));
    post({ type: "stage", stage: 3 });
    post({ type: "stage", stage: 4, counts: { channels: data.channels.length } });
    post({ type: "stage", stage: 5, counts: { movies: data.movies.length } });
    post({ type: "stage", stage: 6, counts: { series: data.series.length } });
    post({ type: "done", data });
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : "Falha ao processar a lista.",
    });
  }
}

self.onmessage = (event: MessageEvent<ParseWorkerRequest>) => {
  const msg = event.data;
  if ("type" in msg && msg.type === "chunk") {
    chunks.push(msg.text);
    return;
  }
  if ("type" in msg && msg.type === "end") {
    const text = chunks.join("");
    chunks = [];
    run(text);
    return;
  }
  if ("text" in msg) run(msg.text);
};
