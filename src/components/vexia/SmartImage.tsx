import { PosterArt } from "./PosterArt";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  adaptiveSizes,
  adaptiveSrcSet,
  enhanceLevel,
  exactImage,
  placeholderImage,
  requiredPhysicalWidth,
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
  /** Nº da tentativa atual (0 = primeira). Usado para retentar sozinho. */
  const [attempt, setAttempt] = useState(0);
  /** Tamanho real desenhado na tela (px CSS), medido no cliente. */
  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const stable = stableImage(src, role);
  /** Escolha responsiva: tamanho ideal para a largura medida + DPI da tela. */
  const ideal = measured.w ? exactImage(src, role, measured.w, measured.h) : undefined;
  // Só troca quando a versão ideal for MAIOR que a estável: nunca borra e não
  // desperdiça download quando o card já está nítido.
  // Assim que o card é medido, usamos o arquivo EXATO para aquele tamanho —
  // menor download, imagem aparece muito mais rápido e sem perder nitidez.
  const base = ideal ?? stable;
  const chosen = upgraded ?? base;
  // A retentativa usa um parâmetro novo na URL para o navegador/cache não
  // devolver a falha anterior (o TMDB ignora parâmetros extras).
  const full =
    attempt > 0 && chosen
      ? `${chosen}${chosen.includes("?") ? "&" : "?"}vexia-retry=${attempt}`
      : chosen;
  // Antes da medição não disparamos download nenhum (evita baixar 2 versões).
  const ready = eager || measured.w > 0;
  const preview = usePreview ? placeholderImage(src, role) : undefined;

  useEffect(() => {
    setBroken(false);
    setLoaded(false);
    setEnhance("none");
    setUpgraded(undefined);
    setAttempt(0);
  }, [base]);

  /**
   * Retentativa automática por DEMORA: se a capa não chegou em ~6s, tentamos
   * de novo (até 2 vezes). Depois disso mostramos a arte de fallback, então o
   * card nunca fica preso num carregamento infinito.
   */
  useEffect(() => {
    if (!ready || loaded || broken || !full) return;
    const timeout = setTimeout(() => {
      if (attempt < MAX_ATTEMPTS) setAttempt((current) => current + 1);
      else {
        setBroken(true);
        onFail?.();
      }
    }, SLOW_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loaded, broken, full, attempt]);


  /** Mede o elemento e refaz a medição quando a tela/densidade muda. */
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el || typeof window === "undefined") return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width || el.clientWidth);
      const h = Math.round(rect.height || el.clientHeight);
      if (!w && !h) return;
      setMeasured((prev) =>
        Math.abs(prev.w - w) > 4 || Math.abs(prev.h - h) > 4 ? { w, h } : prev,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const unsubscribe = subscribeDisplay(measure);
    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [src]);


  /**
   * Otimização automática: compara a resolução real do arquivo com o tamanho
   * desenhado na tela. Se estiver sendo ampliada, primeiro tenta buscar uma
   * versão maior no TMDB (upscale inteligente por fonte); se já for a maior
   * disponível, aplica o realce (nitidez + redução de ruído) proporcional.
   */
  const optimize = (el: HTMLImageElement) => {
    const rect = el.getBoundingClientRect();
    const rendered = requiredPhysicalWidth(
      rect.width || el.clientWidth,
      rect.height || el.clientHeight,
      role,
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
        <PosterArt title={alt || ""} compact={role === "logo" || role === "still"} />
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
        src={ready ? full : undefined}
        srcSet={upgraded || measured.w ? undefined : ready ? adaptiveSrcSet(src, role) : undefined}
        sizes={upgraded || measured.w ? undefined : (sizes ?? adaptiveSizes(role))}
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
