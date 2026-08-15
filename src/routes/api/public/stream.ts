import { createFileRoute } from "@tanstack/react-router";

/**
 * Proxy de reprodução (HLS / TS / progressivo).
 *
 * Existe por dois motivos práticos no APK/navegador:
 *  - conteúdo misto: um app servido em https não pode tocar stream em http;
 *  - CORS: muitos servidores IPTV não enviam Access-Control-Allow-Origin,
 *    o que impede o hls.js/mpegts.js de ler os segmentos.
 *
 * Para listas .m3u8 os links internos são reescritos para voltarem por aqui,
 * senão o player tentaria baixar os segmentos direto do servidor original.
 * Somente leitura de um link informado pelo próprio usuário; nada é persistido.
 */
const PROXY_PATH = "/api/public/stream";

function proxied(url: string) {
  return `${PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

function rewriteManifest(text: string, base: URL) {
  const abs = (raw: string) => {
    try {
      return proxied(new URL(raw, base).toString());
    } catch {
      return raw;
    }
  };
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        // Reescreve atributos URI="..." (chaves, legendas, áudio alternativo).
        return line.replace(/URI="([^"]+)"/g, (_all, uri: string) => `URI="${abs(uri)}"`);
      }
      return abs(trimmed);
    })
    .join("\n");
}

export const Route = createFileRoute("/api/public/stream")({
  server: {
    handlers: {
      HEAD: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";
        if (!target) return new Response(null, { status: 400 });

        try {
          const upstream = await fetch(target, {
            method: "HEAD",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" },
            redirect: "follow",
          });
          return new Response(null, {
            status: upstream.status,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        } catch {
          return new Response(null, { status: 502 });
        }
      },
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

        const range = request.headers.get("range");
        let upstream: Response;
        try {
          const fetchOptions: RequestInit = {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
              Accept: "*/*",
              ...(range ? { Range: range } : {}),
            },
            redirect: "follow",
          };

          upstream = await fetch(parsed.toString(), fetchOptions);
        } catch (e: any) {
          console.error(`[StreamProxy] Error fetching ${parsed.toString()}:`, e.message || e);
          return new Response(`Servidor de stream indisponível: ${e.message || "Erro desconhecido"}`, { status: 502 });
        }

        if (!upstream.ok || !upstream.body) {
          return new Response(`O servidor respondeu ${upstream.status}.`, { status: 502 });
        }

        const type = (upstream.headers.get("content-type") ?? "").toLowerCase();
        const isManifest =
          type.includes("mpegurl") ||
          parsed.pathname.toLowerCase().endsWith(".m3u8") ||
          parsed.pathname.toLowerCase().endsWith(".m3u") ||
          parsed.search.toLowerCase().includes(".m3u8");

        const headers = new Headers({
          "Cache-Control": "public, max-age=1, stale-while-revalidate=10",
          "Access-Control-Allow-Origin": "*",
        });

        if (isManifest) {
          const text = await upstream.text();
          headers.set("Content-Type", "application/vnd.apple.mpegurl");
          // A base é a URL final (após redirecionamentos) do manifesto.
          const base = new URL(upstream.url || parsed.toString());
          return new Response(rewriteManifest(text, base), { status: 200, headers });
        }

        headers.set("Content-Type", upstream.headers.get("content-type") ?? "video/mp2t");
        for (const key of ["content-length", "content-range", "accept-ranges"]) {
          const value = upstream.headers.get(key);
          if (value) headers.set(key, value);
        }
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
