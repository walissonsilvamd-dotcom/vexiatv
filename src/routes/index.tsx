import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import splashAsset from "../assets/splash-clean.jpeg.asset.json";
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
      {/* Luzes ambiente: halo roxo respirando + aurora ciano girando lentamente. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="absolute inset-0 rounded-full animate-[splash-breathe_9s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--vexia-purple) 22%, transparent) 0%, transparent 68%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full mix-blend-screen animate-[splash-aurora_26s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, color-mix(in oklab, var(--vexia-purple) 22%, transparent), color-mix(in oklab, var(--vexia-cyan) 16%, transparent), color-mix(in oklab, var(--vexia-purple) 22%, transparent))",
            filter: "blur(110px)",
          }}
        />
      </div>

      {/* Textura sutil de pontos — acabamento premium. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex h-full w-full max-w-full flex-col items-center justify-center gap-[clamp(1rem,3vmin,2rem)] text-center">
        <h1 className="sr-only">VÉXIA TV</h1>

        {/* Logo: entrada cinematográfica (aproxima, ganha foco e assenta). */}
        <div className="relative mx-auto max-w-full animate-[splash-logo-reveal_1200ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <VexiaLogo className="mx-auto h-[min(42vh,46vmin)] max-w-[88%] object-contain animate-[splash-logo-glow_5s_ease-in-out_600ms_infinite]" />
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
          0%   { opacity: 0; transform: scale(0.86) translateY(20px); filter: blur(12px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); filter: blur(0.4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes splash-logo-glow {
          0%, 100% { filter: drop-shadow(0 0 12px color-mix(in oklab, var(--vexia-purple) 42%, transparent)); }
          50%      { filter: drop-shadow(0 0 22px color-mix(in oklab, var(--vexia-cyan) 38%, transparent)); }
        }
        @keyframes splash-breathe {
          0%, 100% { opacity: 0.28; transform: scale(1); }
          50%      { opacity: 0.48; transform: scale(1.05); }
        }
        @keyframes splash-aurora {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splash-rule {
          from { opacity: 0; transform: scaleX(0.2); }
          to   { opacity: 0.85; transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
