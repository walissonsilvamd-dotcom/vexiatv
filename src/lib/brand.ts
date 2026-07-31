import logoAsset from "../assets/vexia-logo-tv.png.asset.json";

/**
 * IDENTIDADE DA MARCA — ponto único de troca.
 *
 * Para mudar a LOGO do app: troque o import acima pelo novo `.asset.json`.
 * Para mudar as CORES: edite `--vexia-primary` / `--vexia-secondary`
 * (e os respectivos `-rgb`) no bloco :root de `src/styles.css`.
 * Todo o app (botões, glows, bordas, degradês, player, filtros) segue junto.
 */
export const BRAND = {
  name: "VÉXIA TV",
  logoUrl: logoAsset.url,
} as const;

export const BRAND_LOGO_URL = BRAND.logoUrl;

/**
 * SPLASH — independente do resto do app.
 *
 * `primary`   → logo principal exibida na abertura.
 * `secondary` → logo opcional (2ª marca / parceiro). Deixe `null` para exibir só uma.
 *
 * Para usar uma logo diferente na splash, importe outro `.asset.json`
 * e aponte aqui — nenhuma outra tela é afetada.
 */
export const SPLASH_BRAND = {
  primary: logoAsset.url as string,
  secondary: null as string | null,
} as const;
