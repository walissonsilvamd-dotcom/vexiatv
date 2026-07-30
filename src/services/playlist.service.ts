export const DOWNLOAD_IDLE_TIMEOUT_MS = 45_000;
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

function proxyUrl(url: string) {
  return `/api/public/playlist?url=${encodeURIComponent(url)}`;
}

/** Uma tentativa: baixa em streaming e emite progresso real por bytes recebidos. */
async function attemptDownload(
  url: string,
  onEvent: ((event: DownloadEvent) => void) | undefined,
  signal: AbortSignal | undefined,
): Promise<string> {
  const controller = new AbortController();
  const abortOuter = () => controller.abort();
  signal?.addEventListener("abort", abortOuter);

  // Timeout de inatividade: só cancela se o servidor parar de enviar dados.
  let idle: ReturnType<typeof setTimeout> | undefined;
  const bumpIdle = () => {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => controller.abort(), DOWNLOAD_IDLE_TIMEOUT_MS);
  };

  try {
    bumpIdle();
    const response = await fetch(proxyUrl(url), { signal: controller.signal });
    bumpIdle();

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new PlaylistDownloadError(
        detail || `O servidor da lista respondeu ${response.status}.`,
      );
    }

    const totalBytes = Number(response.headers.get("content-length") ?? 0);

    if (!response.body) {
      const text = await response.text();
      onEvent?.({ type: "progress", ratio: 1 });
      return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let text = "";
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bumpIdle();
      received += value.byteLength;
      text += decoder.decode(value, { stream: true });
      if (onEvent) {
        const ratio = totalBytes
          ? Math.min(0.99, received / totalBytes)
          : // Sem content-length: curva assintótica sobre os bytes recebidos (base 4 MB).
            1 - Math.exp(-received / 4_000_000);
        onEvent({ type: "progress", ratio });
      }
    }
    text += decoder.decode();

    if (!text.includes("#EXTINF") && !text.includes("#EXTM3U")) {
      throw new PlaylistDownloadError("O link não retornou uma lista M3U válida.");
    }

    onEvent?.({ type: "progress", ratio: 1 });
    return text;
  } catch (err) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new PlaylistDownloadError(
        "O servidor da lista parou de responder durante o download.",
        `Sem dados por ${DOWNLOAD_IDLE_TIMEOUT_MS / 1000}s`,
      );
    }
    throw err;
  } finally {
    if (idle) clearTimeout(idle);
    signal?.removeEventListener("abort", abortOuter);
  }
}

/**
 * Baixa o texto da lista com até 3 tentativas.
 * O progresso vem dos bytes realmente recebidos, então listas grandes
 * (dezenas de MB) continuam avançando em vez de travar.
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
    try {
      return await attemptDownload(url, onEvent, signal);
    } catch (err) {
      lastError = err;
      console.error(`[vexia] falha no download da lista (tentativa ${attempt})`, err);
      // Lista inválida não melhora com retry.
      if (err instanceof PlaylistDownloadError && /lista M3U válida/.test(err.message)) throw err;
      if (attempt < DOWNLOAD_MAX_ATTEMPTS && !signal?.aborted) await wait(1200 * attempt);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : undefined;
  throw new PlaylistDownloadError(
    detail || "Não foi possível carregar a lista. Verifique sua conexão e tente novamente.",
    detail,
  );
}
