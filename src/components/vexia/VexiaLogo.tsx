import logoAsset from "../../assets/vexia-logo-tv.png.asset.json";

/**
 * Contorno escuro (4 direções + halo) para separar a logo de fundos claros
 * ou detalhados, somado ao brilho neon roxo da marca.
 */
const LOGO_FILTER = [
  "drop-shadow(0 0 1px rgba(0,0,0,0.95))",
  "drop-shadow(1px 0 1px rgba(0,0,0,0.85))",
  "drop-shadow(-1px 0 1px rgba(0,0,0,0.85))",
  "drop-shadow(0 1px 1px rgba(0,0,0,0.85))",
  "drop-shadow(0 -1px 1px rgba(0,0,0,0.85))",
  "drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
  "drop-shadow(0 0 18px color-mix(in oklab, var(--vexia-purple) 65%, transparent))",
].join(" ");

export function VexiaLogo({ className = "h-14" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="VÉXIA TV"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className={`${className} w-auto select-none object-contain`}
      style={{ filter: LOGO_FILTER }}
      draggable={false}
    />
  );
}

