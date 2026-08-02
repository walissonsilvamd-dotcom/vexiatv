import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import splashAsset from "../assets/splash-vexia.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Carregando` },
      { name: "description", content: `${BRAND.name} — player de streaming para Smart TV.` },
      { property: "og:title", content: `${BRAND.name}` },
      { property: "og:description", content: "Player de streaming para Smart TV." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://vexiatv.lovable.app${splashAsset.url}` },
      { property: "og:url", content: "https://vexiatv.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${splashAsset.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/" }],
  }),
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const navigateTimer = setTimeout(() => navigate({ to: "/home" }), 2700);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div
      className={[
        "fixed inset-0 overflow-hidden bg-vexia-bg",
        "animate-[vexia-fade_700ms_ease-out]",
        exiting ? "animate-[splash-cinematic-exit_900ms_cubic-bezier(0.65,0,0.35,1)_forwards]" : "",
      ].join(" ")}
    >
      <h1 className="sr-only">VÉXIA TV — carregando</h1>

      {/* Splash oficial em tela cheia. */}
      <img
        src={splashAsset.url}
        alt=`${BRAND.name}`
        className="absolute inset-0 h-full w-full object-cover"
        fetchPriority="high"
      />

      {/* Loader: cobre o círculo estático da arte e gira enquanto o app carrega. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[82.3%] -translate-x-1/2 -translate-y-1/2"
      >
        {/* Máscara suave para o círculo impresso não aparecer atrás. */}
        <div
          className="absolute left-1/2 top-1/2 h-[16vmin] w-[16vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(4,6,18,0.98) 0%, rgba(4,6,18,0.9) 45%, transparent 72%)",
          }}
        />
        <div
          className="relative h-[5.2vmin] w-[5.2vmin] min-h-[26px] min-w-[26px] animate-[splash-spin_1100ms_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, var(--vexia-cyan), var(--vexia-purple), var(--vexia-cyan))",
            WebkitMask:
              "repeating-conic-gradient(from 0deg, #000 0deg 12deg, transparent 12deg 24deg), radial-gradient(farthest-side, transparent calc(100% - 34%), #000 calc(100% - 34%))",
            mask: "repeating-conic-gradient(from 0deg, #000 0deg 12deg, transparent 12deg 24deg), radial-gradient(farthest-side, transparent calc(100% - 34%), #000 calc(100% - 34%))",
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
            filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--vexia-cyan) 55%, transparent))",
          }}
        />
      </div>

      <style>{`
        @keyframes splash-spin { to { transform: rotate(360deg); } }
        @keyframes vexia-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splash-cinematic-exit {
          0%   { opacity: 1; transform: scale(1); filter: blur(0); }
          40%  { opacity: 0.75; transform: scale(1.02); filter: blur(2px); }
          100% { opacity: 0; transform: scale(1.06); filter: blur(8px); }
        }
      `}</style>
    </div>
  );
}
