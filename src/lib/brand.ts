import logoAsset from "../assets/vexia-logo-tv.png.asset.json";

/**
 * IDENTIDADE DA MARCA — ponto único de troca.
 *
 * Para mudar a LOGO: troque o import acima pelo novo `.asset.json`.
 * Para mudar as CORES: edite `--vexia-primary` / `--vexia-secondary`
 * (e os respectivos `-rgb`) no bloco :root de `src/styles.css`.
 * Todo o app (botões, glows, bordas, degradês, player, filtros) segue junto.
 */
export const BRAND = {
  name: "VÉXIA TV",
  logoUrl: logoAsset.url,
} as const;

export const BRAND_LOGO_URL = BRAND.logoUrl;
