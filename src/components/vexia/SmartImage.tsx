import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import {
  adaptiveSizes,
  adaptiveSrcSet,
  placeholderImage,
  stableImage,
  type ImageRole,
} from "../../lib/image";

/**
 * Imagem VÉXIA com carregamento progressivo.
 *
 * Como funciona (pensado para TVs com pouca memória / internet lenta):
 *  1. Aparece imediatamente uma prévia minúscula e borrada (LQIP), então o card
 *     nunca fica "vazio" nem pisca preto.
 *  2. A imagem final é baixada no tamanho ideal para a tela (4K / HD / celular).
 *  3. Antes de mostrar, ela é decodificada fora da tela (`img.decode()`), o que
 *     evita o travadinho do scroll no momento em que a imagem entra na tela.
 *  4. Se falhar, cai num fundo com ícone — sem quebrar o layout.
 */
export function SmartImage({
  src,
  alt,
  role = "poster",
  className = "",
  objectPosition,
  eager = false,
  sizes,
  fallback,
  preview: usePreview = true,
}: {
  src?: string | null;
  alt: string;
  role?: ImageRole;
  className?: string;
  objectPosition?: string;
  eager?: boolean;
  sizes?: string;
  fallback?: React.ReactNode;
  /** Desativa a prévia borrada quando a imagem não está num container relativo. */
  preview?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const full = stableImage(src, role);
  const preview = usePreview ? placeholderImage(src, role) : undefined;

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
  }, [full]);

  // Se a imagem já estava em cache (SW / navegador), o onLoad pode não disparar.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, [full]);

  if (!src || broken) {
    return (
      fallback ?? (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-vexia-purple/40 to-black">
          <ImageOff className="h-6 w-6 text-vexia-cyan/70" aria-hidden />
        </div>
      )
    );
  }

  const shared = objectPosition ? { objectPosition } : undefined;

  return (
    <>
      {usePreview && !loaded ? (
        preview ? (
          <img
            src={preview}
            alt=""
            aria-hidden
            decoding="async"
            style={shared}
            className={`vexia-img-preview ${className}`}
          />
        ) : (
          <span className="vexia-img-skeleton" aria-hidden />
        )
      ) : null}
      <img
        ref={imgRef}
        src={full}
        srcSet={adaptiveSrcSet(src, role)}
        sizes={sizes ?? adaptiveSizes(role)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={(event) => {
          const el = event.currentTarget;
          // Decodifica antes de exibir: mantém o scroll da TV fluido.
          const done = () => setLoaded(true);
          if (el.decode) el.decode().then(done, done);
          else done();
        }}
        onError={() => setBroken(true)}
        style={shared}
        className={`vexia-img ${loaded ? "is-loaded" : ""} ${className}`}
      />
    </>
  );
}
