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
      {/* Aura de energia que respira atrás da logo — centralizada de forma absoluta. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full animate-[splash-aura_3.6s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--vexia-purple) 40%, transparent) 0%, color-mix(in oklab, var(--vexia-cyan) 12%, transparent) 45%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      <div className="relative flex h-full w-full max-w-full flex-col items-center justify-center gap-[clamp(1rem,3vmin,2rem)] text-center">
        <h1 className="sr-only">VÉXIA TV</h1>

        {/* Logo: entrada com foco, brilho neon pulsante e brilho que atravessa. */}
        <div className="relative mx-auto max-w-full animate-[splash-logo-in_1100ms_cubic-bezier(0.22,1,0.36,1)_both]">
          <div className="animate-[splash-logo-breathe_3.2s_ease-in-out_infinite]">
            <VexiaLogo className="mx-auto h-[min(42vh,46vmin)] max-w-full object-contain" />
          </div>

          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-[splash-shine_3.2s_ease-in-out_infinite]"
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
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
        @keyframes splash-logo-in {
          0%   { opacity: 0; transform: scale(0.86); filter: blur(14px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes splash-logo-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 22px color-mix(in oklab, var(--vexia-purple) 60%, transparent)); }
          50%      { transform: scale(1.035); filter: drop-shadow(0 0 46px color-mix(in oklab, var(--vexia-purple) 85%, transparent)) drop-shadow(0 0 22px color-mix(in oklab, var(--vexia-cyan) 45%, transparent)); }
        }
        @keyframes splash-shine {
          0%, 25%  { transform: translateX(-120%); opacity: 0; }
          35%      { opacity: 1; }
          70%      { transform: translateX(120%); opacity: 0; }
          100%     { transform: translateX(120%); opacity: 0; }
        }
        @keyframes splash-aura {
          0%, 100% { opacity: 0.45; transform: scale(0.95); }
          50%      { opacity: 0.85; transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[splash-logo-breathe_3\\.2s_ease-in-out_infinite\\],
          .animate-\\[splash-aura_3\\.6s_ease-in-out_infinite\\] { animation: none; }
        }
      `}</style>
    </div>
  );
}

