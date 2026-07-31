/**
 * Servidor padrão do VÉXIA TV.
 *
 * O cliente informa apenas LOGIN e SENHA — o app monta o link Xtream
 * (get.php) usando este endereço. Para trocar de painel, mude só esta linha.
 * Ex.: "http://meupainel.com:8080"
 */
export const DEFAULT_XTREAM_SERVER = "";

/** Servidor a usar: o informado (colado/QR) ou o padrão do app. */
export function resolveServer(server?: string) {
  const typed = (server ?? "").trim();
  return typed || DEFAULT_XTREAM_SERVER;
}
