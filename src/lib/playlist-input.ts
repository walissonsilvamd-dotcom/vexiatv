/**
 * Entradas aceitas pelo VÉXIA TV para carregar uma lista:
 *  1) Usuário + senha (+ servidor)  → monta a URL Xtream (get.php)
 *  2) Link M3U / M3U8 colado direto
 *  3) Link lido pelo QR Code (M3U ou HLS)
 */

/** Garante http:// quando o usuário digita só o host/porta. */
export function normalizeHost(server: string) {
  const base = server.trim().replace(/\/+$/, "");
  if (!base) return "";
  return /^https?:\/\//i.test(base) ? base : `http://${base}`;
}

/** Monta o link padrão Xtream Codes a partir de servidor + usuário + senha. */
export function buildXtreamUrl(server: string, username: string, password: string) {
  const host = normalizeHost(server);
  if (!host || !username.trim()) return "";
  return `${host}/get.php?username=${encodeURIComponent(username.trim())}&password=${encodeURIComponent(
    password.trim(),
  )}&type=m3u_plus&output=ts`;
}

export type PastedAccess = {
  server?: string;
  username?: string;
  password?: string;
  url?: string;
};

/**
 * Lê qualquer coisa que o cliente cole: URL completa do painel, host,
 * "usuario:senha", "host|usuario|senha" ou um link M3U/HLS puro.
 */
export function parsePastedAccess(raw: string): PastedAccess {
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return {};

  // URL completa (get.php / player_api / m3u / m3u8)
  if (/^https?:\/\//i.test(text)) {
    try {
      const u = new URL(text);
      const username = u.searchParams.get("username") ?? undefined;
      const password = u.searchParams.get("password") ?? undefined;
      if (username) {
        return {
          server: `${u.protocol}//${u.host}`,
          username,
          password: password ?? "",
          url: /get\.php/i.test(u.pathname) ? text : undefined,
        };
      }
      return { url: text };
    } catch {
      return { url: text };
    }
  }

  // host|usuario|senha  ou  host usuario senha separados por | ; ,
  const parts = text.split(/[|;,]/).filter(Boolean);
  if (parts.length >= 3) {
    return { server: parts[0], username: parts[1], password: parts[2] };
  }

  // usuario:senha (sem "//" para não confundir com URL)
  if (/^[^:/]+:[^:/]+$/.test(text)) {
    const [username, password] = text.split(":");
    return { username, password };
  }

  // host puro (com ponto ou porta)
  if (/[.:]/.test(text)) return { server: text };

  return { username: text };
}

/** Link de stream HLS único (não é uma lista com vários itens). */
export function isDirectHls(url: string) {
  const clean = url.split("?")[0]?.toLowerCase() ?? "";
  if (/get\.php|player_api|\/playlist/.test(url.toLowerCase())) return false;
  return clean.endsWith(".m3u8");
}

/** Transforma um link HLS único numa lista M3U mínima de 1 canal. */
export function singleChannelPlaylist(url: string, name = "Canal ao vivo") {
  const safeName = name.replace(/[\r\n"]/g, " ").trim() || "Canal ao vivo";
  return `#EXTM3U\n#EXTINF:-1 tvg-id="vexia-hls" tvg-name="${safeName}" group-title="AO VIVO",${safeName}\n${url}\n`;
}

/** Valida o mínimo para tentar carregar. */
export function isLikelyPlaylistUrl(url: string) {
  return /^https?:\/\/\S+$/i.test(url.trim());
}
