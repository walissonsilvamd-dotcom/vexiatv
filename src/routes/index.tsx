import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import splashAsset from "../assets/splash-clean.jpeg.asset.json";
import logoAsset from "../assets/vexia-logo-tv.png.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { SLOGAN } from "../data/vexia-catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Carregando" },
      { name: "description", content: "VÉXIA TV — player de streaming para Smart TV." },
      { property: "og:title", content: "VÉXIA TV" },
      { property: "og:description", content: "Player de streaming para Smart TV." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: splashAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: splashAsset.url },
    ],
  }),
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const id = setTimeout(() => navigate({ to: "/home" }), 2000);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <div className="vexia-overscan fixed inset-0 grid place-items-center overflow-hidden bg-vexia-bg animate-[vexia-fade_700ms_ease-out]">
      {/* Halo estático e discreto atrás da logo — surge uma vez e permanece. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full animate-[splash-halo-in_1400ms_ease-out_both]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--vexia-purple) 26%, transparent) 0%, color-mix(in oklab, var(--vexia-cyan) 8%, transparent) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative flex h-full w-full max-w-full flex-col items-center justify-center gap-[clamp(1rem,3vmin,2rem)] text-center">
        <h1 className="sr-only">VÉXIA TV</h1>

        {/* Logo: revelação cinematográfica (foco + assentamento) e um único brilho especular. */}
        <div className="relative mx-auto max-w-full animate-[splash-logo-reveal_1500ms_cubic-bezier(0.16,1,0.3,1)_both]">
          <VexiaLogo className="mx-auto h-[min(42vh,46vmin)] max-w-[88%] object-contain" />

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-[splash-sheen_2600ms_cubic-bezier(0.4,0,0.2,1)_800ms_both]"
            style={{
              background:
                "linear-gradient(100deg, transparent 42%, rgba(255,255,255,0.38) 50%, transparent 58%)",
              mixBlendMode: "screen",
              maskImage: `url(${logoAsset.url})`,
              WebkitMaskImage: `url(${logoAsset.url})`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
        </div>

        {/* Filete de luz que se abre sob a logo — acabamento sóbrio, sem pulsar. */}
        <div
          aria-hidden
          className="h-px w-[min(34vmin,60%)] origin-center animate-[splash-rule_1200ms_cubic-bezier(0.16,1,0.3,1)_600ms_both]"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--vexia-purple) 80%, transparent) 35%, color-mix(in oklab, var(--vexia-cyan) 70%, transparent) 65%, transparent)",
          }}
        />

        <div
          className="h-[clamp(2.25rem,6vmin,3.5rem)] w-[clamp(2.25rem,6vmin,3.5rem)] rounded-full animate-[splash-spin_1s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, var(--vexia-purple) 0deg, var(--vexia-purple-soft) 140deg, transparent 300deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />

        <p className="text-[clamp(0.7rem,1.6vmin,1rem)] font-medium tracking-[0.4em] text-vexia-muted">
          CARREGANDO
        </p>
      </div>

      <p className="absolute bottom-[max(var(--vexia-overscan-y),env(safe-area-inset-bottom))] left-1/2 w-full -translate-x-1/2 px-[var(--vexia-overscan-x)] text-center text-[clamp(0.6rem,1.3vmin,0.85rem)] tracking-[0.3em] text-vexia-cyan">
        {SLOGAN}
      </p>



      <style>{`
        @keyframes splash-spin { to { transform: rotate(360deg); } }
        @keyframes vexia-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splash-logo-reveal {
          0%   { opacity: 0; transform: scale(1.06) translateY(6px); filter: blur(10px); }
          55%  { opacity: 1; filter: blur(0.4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes splash-sheen {
          0%   { transform: translateX(-115%); opacity: 0; }
          18%  { opacity: 1; }
          62%  { transform: translateX(115%); opacity: 0; }
          100% { transform: translateX(115%); opacity: 0; }
        }
        @keyframes splash-halo-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to   { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes splash-rule {
          from { opacity: 0; transform: scaleX(0.2); }
          to   { opacity: 0.85; transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[splash-sheen_2600ms_cubic-bezier\\(0\\.4\\,0\\,0\\.2\\,1\\)_800ms_both\\] { animation: none; opacity: 0; }
        }
      `}</style>

    </div>
  );
}

