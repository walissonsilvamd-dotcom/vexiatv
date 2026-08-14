/**
 * Servidor padrão do VÉXIA TV.
 *
 * O cliente informa apenas LOGIN e SENHA — o app monta o link Xtream
 * (get.php) usando este endereço. Para trocar de painel, mude só esta linha.
 * Ex.: "http://meupainel.com:8080"
 */
export const DEFAULT_XTREAM_SERVER = "https://doplay.sbs";

/**
 * DNS confiáveis do VÉXIA TV. Qualquer lista (login/senha) desses servidores
 * funciona no app. O primeiro é o padrão usado quando o cliente não informa
 * servidor; os demais ficam disponíveis para seleção/fallback.
 */
export const TRUSTED_XTREAM_SERVERS = [
  "https://doplay.sbs",
  "https://lunnaplus.sbs",
] as const;

/** Servidor a usar: o informado (colado/QR) ou o padrão do app. */
export function resolveServer(server?: string) {
  const typed = (server ?? "").trim();
  return typed || DEFAULT_XTREAM_SERVER;
}

