import { BRAND } from "../../lib/brand";

/**
 * Contorno escuro (4 direções + halo) para separar a logo de fundos claros
 * ou detalhados, somado ao brilho neon roxo da marca.
 */
const LOGO_FILTER = [
  "drop-shadow(0 0 1px rgba(0,0,0,0.95))",
  "drop-shadow(0 8px 30px rgba(0,0,0,0.9))",
  "drop-shadow(0 0 25px rgba(255, 255, 255, 0.2))",
].join(" ");

export function VexiaLogo({ className = "h-36 md:h-44" }: { className?: string }) {
  return (
    <img
      src={BRAND.logoUrl}
      alt={BRAND.name}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      className={`${className} w-auto select-none object-contain`}
      style={{ filter: LOGO_FILTER }}
      draggable={false}
    />
  );
}

