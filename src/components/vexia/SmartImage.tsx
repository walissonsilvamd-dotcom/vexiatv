import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { adaptiveImage, adaptiveSizes, adaptiveSrcSet, type ImageRole } from "../../lib/image";

/**
 * Imagem VÉXIA: tamanho adaptativo (4K / HD / celular), carregamento
 * progressivo com fade suave, decodificação assíncrona e fallback visual.
 */
export function SmartImage({
  src,
  alt,
  role = "poster",
  className = "",
  objectPosition,
  eager = false,
  fallback,
}: {
  src?: string | null;
  alt: string;
  role?: ImageRole;
  className?: string;
  objectPosition?: string;
  eager?: boolean;
  fallback?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [src]);

  if (!src || broken) {
    return (
      fallback ?? (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-vexia-purple/40 to-black">
          <ImageOff className="h-6 w-6 text-vexia-cyan/70" aria-hidden />
        </div>
      )
    );
  }

  return (
    <img
      src={adaptiveImage(src, role)}
      srcSet={adaptiveSrcSet(src, role)}
      sizes={adaptiveSizes(role)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
      style={objectPosition ? { objectPosition } : undefined}
      className={`vexia-img ${loaded ? "is-loaded" : ""} ${className}`}
    />
  );
}
