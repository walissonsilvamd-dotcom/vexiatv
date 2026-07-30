/**
 * Informações da conta IPTV (Xtream Codes) — usadas para saber até quando a
 * lista salva continua válida. A lista fica guardada no aparelho para sempre;
 * só deixa de funcionar quando chega a data de expiração do plano.
 */

export type PlaylistAccount = {
  /** "Active", "Expired", "Disabled"… conforme o painel do provedor. */
  status: string;
  /** Data de expiração em ms (epoch). null = sem data informada / ilimitada. */
  expiresAt: number | null;
  maxConnections: number | null;
  activeConnections: number | null;
  /** Quando essa informação foi consultada (epoch ms). */
  checkedAt: number;
};

/** Converte um link get.php em player_api.php (mesmas credenciais). */
export function xtreamApiUrl(playlistUrl: string): string | null {
  try {
    const u = new URL(playlistUrl);
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (!username) return null;
    return `${u.protocol}//${u.host}/player_api.php?username=${encodeURIComponent(
      username,
    )}&password=${encodeURIComponent(password ?? "")}`;
  } catch {
    return null;
  }
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type UserInfo = {
  status?: string;
  auth?: number;
  exp_date?: string | number | null;
  max_connections?: string | number;
  active_cons?: string | number;
};

/**
 * Consulta a validade da conta pelo proxy do app (evita CORS).
 * Retorna null quando a lista não é Xtream ou o servidor não respondeu —
 * nesse caso a lista continua valendo normalmente.
 */
export async function fetchPlaylistAccount(
  playlistUrl: string,
  signal?: AbortSignal,
): Promise<PlaylistAccount | null> {
  const api = xtreamApiUrl(playlistUrl);
  if (!api) return null;
  try {
    const res = await fetch(`/api/public/playlist?url=${encodeURIComponent(api)}`, { signal });
    if (!res.ok || res.headers.get("X-Playlist-Error") === "1") return null;
    const raw = await res.text();
    const json = JSON.parse(raw) as { user_info?: UserInfo };
    const info = json.user_info;
    if (!info) return null;
    const expSeconds = toNumber(info.exp_date);
    return {
      status: info.status || (info.auth === 1 ? "Active" : "Unknown"),
      expiresAt: expSeconds ? expSeconds * 1000 : null,
      maxConnections: toNumber(info.max_connections),
      activeConnections: Number.isFinite(Number(info.active_cons))
        ? Number(info.active_cons)
        : null,
      checkedAt: Date.now(),
    };
  } catch (err) {
    console.warn("[vexia] não foi possível consultar a validade da lista", err);
    return null;
  }
}

/** A conta expirou? Só é verdade quando há data e ela já passou. */
export function isAccountExpired(account: PlaylistAccount | null | undefined): boolean {
  if (!account) return false;
  if (/expired|banned|disabled/i.test(account.status)) return true;
  return account.expiresAt !== null && account.expiresAt <= Date.now();
}

/** Dias restantes (arredondado para cima). null quando não há data. */
export function daysUntilExpiry(account: PlaylistAccount | null | undefined): number | null {
  if (!account?.expiresAt) return null;
  return Math.ceil((account.expiresAt - Date.now()) / 86_400_000);
}

export function formatExpiry(account: PlaylistAccount | null | undefined): string {
  if (!account) return "Sem informação de validade";
  if (!account.expiresAt) return "Sem data de expiração";
  return new Date(account.expiresAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
