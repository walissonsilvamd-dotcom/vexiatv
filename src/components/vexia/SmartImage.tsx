import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import {
  adaptiveSizes,
  adaptiveSrcSet,
  enhanceLevel,
  exactImage,
  exactSizes,
  placeholderImage,
  stableImage,
  subscribeDisplay,
  upgradeTmdbSize,
  type EnhanceLevel,
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
  onFail,
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
  /** Chamado quando a imagem falha (permite buscar outra fonte, ex.: TMDB). */
  onFail?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enhance, setEnhance] = useState<EnhanceLevel>("none");
  /** Fonte melhorada (upscale inteligente) quando a original é pequena demais. */
  const [upgraded, setUpgraded] = useState<string | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const base = stableImage(src, role);
  const full = upgraded ?? base;
  const preview = usePreview ? placeholderImage(src, role) : undefined;

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
    setEnhance("none");
    setUpgraded(undefined);
  }, [base]);

  /**
   * Otimização automática: compara a resolução real do arquivo com o tamanho
   * desenhado na tela. Se estiver sendo ampliada, primeiro tenta buscar uma
   * versão maior no TMDB (upscale inteligente por fonte); se já for a maior
   * disponível, aplica o realce (nitidez + redução de ruído) proporcional.
   */
  const optimize = (el: HTMLImageElement) => {
    const rendered = Math.round(
      (el.getBoundingClientRect().width || el.clientWidth) *
        Math.min(window.devicePixelRatio || 1, 2),
    );
    const level = enhanceLevel(el.naturalWidth, rendered);
    if (level === "none") {
      setEnhance("none");
      return;
    }
    if (!upgraded) {
      const better = upgradeTmdbSize(el.currentSrc || full, role);
      if (better) {
        setUpgraded(better);
        return;
      }
    }
    setEnhance(level);
  };

  // Se a imagem já estava em cache (SW / navegador), o onLoad pode não disparar.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
      optimize(el);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        srcSet={upgraded ? undefined : adaptiveSrcSet(src, role)}
        sizes={upgraded ? undefined : (sizes ?? adaptiveSizes(role))}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        onLoad={(event) => {
          const el = event.currentTarget;
          // Decodifica antes de exibir: mantém o scroll da TV fluido.
          const done = () => {
            setLoaded(true);
            optimize(el);
          };
          if (el.decode) el.decode().then(done, done);
          else done();
        }}
        onError={() => {
          if (upgraded) {
            // A versão maior não existe: volta para a original e realça.
            setUpgraded(undefined);
            setEnhance("medium");
            return;
          }
          setBroken(true);
          onFail?.();
        }}
        style={shared}
        className={`vexia-img ${loaded ? "is-loaded" : ""} ${
          enhance !== "none" ? `vexia-img-enhance-${enhance}` : ""
        } ${className}`}
      />
    </>
  );
}
