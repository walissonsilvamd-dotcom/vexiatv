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
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-vexia-bg animate-[vexia-fade_700ms_ease-out]">
      <div className="flex flex-col items-center gap-6">
        <h1 className="sr-only">VÉXIA TV</h1>
        <VexiaLogo className="h-48 md:h-64" />

        <div
          className="h-12 w-12 rounded-full animate-[splash-spin_1s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, var(--vexia-purple) 0deg, var(--vexia-purple-soft) 140deg, transparent 300deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
          }}
        />

        <p className="text-sm font-medium tracking-[0.4em] text-vexia-muted">CARREGANDO</p>
      </div>

      <p className="absolute bottom-8 text-xs tracking-[0.3em] text-vexia-cyan">{SLOGAN}</p>

      <style>{`
        @keyframes splash-spin { to { transform: rotate(360deg); } }
        @keyframes vexia-fade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  );
}
