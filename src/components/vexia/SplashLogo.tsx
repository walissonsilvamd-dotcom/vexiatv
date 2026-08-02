import { SPLASH_BRAND } from "../../lib/brand";
import { BRAND } from "../../lib/brand";

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

/**
 * Logo exclusiva da SPLASH. Usa `SPLASH_BRAND` — trocar aqui NÃO afeta
 * as demais telas do app. Exibe 1 ou 2 logos conforme `SPLASH_BRAND.secondary`.
 */
export function SplashLogo({ className = "h-40" }: { className?: string }) {
  const logos = [SPLASH_BRAND.primary, SPLASH_BRAND.secondary].filter(
    (url): url is string => Boolean(url),
  );

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-[clamp(1rem,4vmin,3rem)]">
      {logos.map((url) => (
        <img
          key={url}
          src={url}
          alt=`${BRAND.name}`
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className={`${className} w-auto select-none object-contain`}
          style={{ filter: LOGO_FILTER }}
          draggable={false}
        />
      ))}
    </div>
  );
}
