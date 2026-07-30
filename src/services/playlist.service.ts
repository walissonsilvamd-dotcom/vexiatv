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

/**
 * Variações aceitas pelos painéis Xtream para o mesmo login.
 * Alguns servidores só respondem em um formato específico — se o primeiro
 * falhar, a próxima tentativa usa outro formato automaticamente.
 */
export function playlistUrlVariants(url: string): string[] {
  const out = [url];
  try {
    const u = new URL(url);
    if (!/get\.php/i.test(u.pathname)) return out;
    const variant = (type: string, output?: string) => {
      const c = new URL(url);
      c.searchParams.set("type", type);
      if (output) c.searchParams.set("output", output);
      else c.searchParams.delete("output");
      return c.toString();
    };
    for (const candidate of [
      variant("m3u_plus", "ts"),
      variant("m3u_plus", "m3u8"),
      variant("m3u"),
    ]) {
      if (!out.includes(candidate)) out.push(candidate);
    }
  } catch {
    /* link não parseável: mantém como está */
  }
  return out;
}

/** Traduz a falha do servidor da lista em uma mensagem que o cliente entende. */
export function describeUpstreamFailure(detail: string): string {
  const status = Number((detail.match(/respondeu (\d{3})/) ?? [])[1]);
  if (status === 401 || status === 403) {
    return "Credenciais inválidas ou assinatura expirada. Verifique usuário e senha.";
  }
  if (status === 404) {
    return "Link não encontrado no servidor. Confira o endereço da lista.";
  }
  if (status === 429) {
    return "O servidor da lista recusou por excesso de acessos. Tente novamente em alguns minutos.";
  }
  if (status >= 500) {
    return "O servidor da lista está fora do ar neste momento. Tente novamente mais tarde.";
  }
  return detail || "Erro ao carregar lista. Verifique a URL e tente novamente.";
}

type AttemptOptions = {
  onEvent?: (event: DownloadEvent) => void;
  /** Recebe cada pedaço de texto durante o download (streaming). */
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
};

/** Uma tentativa: baixa em streaming e emite progresso real por bytes recebidos. */
async function attemptDownload(
  url: string,
  { onEvent, onChunk, signal }: AttemptOptions,
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

    if (!response.ok || response.headers.get("X-Playlist-Error") === "1") {
      const detail = await response.text().catch(() => "");
      throw new PlaylistDownloadError(
        describeUpstreamFailure(detail || `O servidor da lista respondeu ${response.status}.`),
        detail,
      );
    }

    const totalBytes = Number(response.headers.get("content-length") ?? 0);
    const collect = !onChunk;

    if (!response.body) {
      const text = await response.text();
      onChunk?.(text);
      onEvent?.({ type: "progress", ratio: 1 });
      return collect ? text : "";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let text = "";
    let head = "";
    let received = 0;
    let sawHeader = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bumpIdle();
      received += value.byteLength;
      const part = decoder.decode(value, { stream: true });
      if (collect) text += part;
      else onChunk?.(part);

      // Valida o cabeçalho já no começo: erro de link/HTML não gasta 100 MB.
      if (!sawHeader) {
        head += part;
        if (head.includes("#EXTM3U") || head.includes("#EXTINF")) sawHeader = true;
        else if (head.length > 4096) {
          const html = /<html|<!doctype/i.test(head);
          throw new PlaylistDownloadError(
            html
              ? "O link abriu uma página do site, não uma lista M3U. Confira o endereço."
              : "O link não retornou uma lista M3U válida.",
          );
        }
      }

      if (onEvent) {
        const ratio = totalBytes
          ? Math.min(0.99, received / totalBytes)
          : // Sem content-length: curva assintótica sobre os bytes recebidos.
            1 - Math.exp(-received / 30_000_000);
        onEvent({ type: "progress", ratio });
      }
    }
    const tail = decoder.decode();
    if (tail) {
      if (collect) text += tail;
      else onChunk?.(tail);
    }
    head += tail;

    if (!sawHeader && !head.includes("#EXTM3U") && !head.includes("#EXTINF")) {
      throw new PlaylistDownloadError(
        received === 0
          ? "O servidor não enviou nenhum conteúdo para esse login."
          : "O link não retornou uma lista M3U válida.",
      );
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

const INVALID = /lista M3U válida|página do site|Credenciais inválidas|não encontrado/i;

/**
 * Baixa a lista com até 3 tentativas, alternando os formatos aceitos pelos
 * painéis (m3u_plus/ts, m3u_plus/m3u8, m3u) quando o servidor recusa.
 *
 * Com `onChunk`, o texto é repassado em pedaços (streaming) e nada gigante
 * fica guardado na thread principal — essencial em Smart TVs com pouca memória.
 */
export async function downloadPlaylist(
  url: string,
  onEvent?: (event: DownloadEvent) => void,
  signal?: AbortSignal,
  onChunk?: (text: string) => void,
): Promise<string> {
  const variants = playlistUrlVariants(url);
  let lastError: unknown;

  for (let attempt = 1; attempt <= DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new PlaylistDownloadError("Download cancelado.");
    const target = variants[Math.min(attempt - 1, variants.length - 1)] ?? url;
    onEvent?.({ type: "attempt", attempt, total: DOWNLOAD_MAX_ATTEMPTS });
    try {
      return await attemptDownload(target, { onEvent, onChunk, signal });
    } catch (err) {
      lastError = err;
      console.error(`[vexia] falha no download da lista (tentativa ${attempt})`, err);
      const invalid = err instanceof PlaylistDownloadError && INVALID.test(err.message);
      // Se ainda há outro formato para testar, vale tentar mesmo em erro "definitivo".
      const hasOtherVariant = attempt < variants.length;
      if (invalid && !hasOtherVariant) throw err;
      if (attempt < DOWNLOAD_MAX_ATTEMPTS && !signal?.aborted) await wait(1200 * attempt);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : undefined;
  throw new PlaylistDownloadError(
    detail || "Erro ao carregar lista. Verifique a URL e tente novamente.",
    detail,
  );
}
