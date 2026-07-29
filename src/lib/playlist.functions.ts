import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Baixa o conteúdo de uma lista M3U/M3U8 no servidor (evita bloqueio de CORS na TV). */
export const fetchPlaylist = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().url() }).parse(data))
  .handler(async ({ data }) => {
    const response = await fetch(data.url, {
      headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" },
    });
    if (!response.ok) {
      throw new Error(`Não foi possível baixar a lista (${response.status})`);
    }
    const text = await response.text();
    if (!text.includes("#EXTINF") && !text.includes("#EXTM3U")) {
      throw new Error("O link não retornou uma lista M3U válida.");
    }
    return { text: text.slice(0, 6_000_000) };
  });
