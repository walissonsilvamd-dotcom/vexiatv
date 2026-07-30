import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy de download da lista M3U/M3U8.
 * Usa uma rota HTTP (em vez de server function) para poder repassar o corpo em
 * streaming — assim o cliente mostra progresso real e não há limite de tamanho.
 * Somente leitura de um link informado pelo próprio usuário; nada é persistido.
 */
export const Route = createFileRoute("/api/public/playlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Link inválido.", { status: 400 });
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return new Response("Apenas links http/https são aceitos.", { status: 400 });
        }

        let upstream: Response;
        try {
          upstream = await fetch(parsed.toString(), {
            headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20", Accept: "*/*" },
            redirect: "follow",
          });
        } catch (err) {
          return new Response(
            `Não foi possível contactar o servidor da lista. ${err instanceof Error ? err.message : ""}`.trim(),
            { status: 502 },
          );
        }

        if (!upstream.ok || !upstream.body) {
          return new Response(`O servidor da lista respondeu ${upstream.status}.`, { status: 502 });
        }

        const headers = new Headers({
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        });
        const length = upstream.headers.get("content-length");
        if (length) headers.set("Content-Length", length);

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
