import { fetchPlaylist } from "../lib/playlist.functions";

export const DOWNLOAD_TIMEOUT_MS = 10_000;
export const DOWNLOAD_MAX_ATTEMPTS = 3;

export type DownloadEvent =
  | { type: "attempt"; attempt: number; total: number }
  | { type: "progress"; ratio: number };

export class PlaylistDownloadError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "PlaylistDownloadError";
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Baixa o texto da lista com timeout de 10s e até 3 tentativas automáticas.
 * O progresso é estimado por tempo decorrido (o corpo chega inteiro do servidor),
 * o que mantém a barra em movimento real durante o download.
 */
export async function downloadPlaylist(
  url: string,
  onEvent?: (event: DownloadEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new PlaylistDownloadError("Download cancelado.");
    onEvent?.({ type: "attempt", attempt, total: DOWNLOAD_MAX_ATTEMPTS });

    const started = Date.now();
    let ticker: ReturnType<typeof setInterval> | undefined;
    if (onEvent) {
      ticker = setInterval(() => {
        const elapsed = Date.now() - started;
        // Curva assintótica: nunca chega a 100% antes da resposta real.
        onEvent({ type: "progress", ratio: 1 - Math.exp(-elapsed / 2500) });
      }, 120);
    }

    try {
      const result = await Promise.race([
        fetchPlaylist({ data: { url } }),
        wait(DOWNLOAD_TIMEOUT_MS).then(() => {
          throw new PlaylistDownloadError(
            "O servidor da lista demorou demais para responder.",
            `Tempo limite de ${DOWNLOAD_TIMEOUT_MS / 1000}s excedido`,
          );
        }),
      ]);
      onEvent?.({ type: "progress", ratio: 1 });
      return (result as { text: string }).text;
    } catch (err) {
      lastError = err;
      if (attempt < DOWNLOAD_MAX_ATTEMPTS && !signal?.aborted) {
        await wait(1200 * attempt);
      }
    } finally {
      if (ticker) clearInterval(ticker);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : undefined;
  throw new PlaylistDownloadError(
    "Não foi possível carregar a lista. Verifique sua conexão e tente novamente.",
    detail,
  );
}
