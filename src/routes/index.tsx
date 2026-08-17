import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import splashVideoAsset from "../assets/Splash_PipocaFlix.mp4.asset.json";
import { BRAND } from "../lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Bem-vindo` },
      { name: "description", content: `${BRAND.name} — player de streaming para Smart TV.` },
      { property: "og:title", content: `${BRAND.name}` },
      { property: "og:description", content: "Player de streaming para Smart TV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/" }],
  }),
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Tenta dar play automaticamente (silencioso por segurança do navegador)
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log("Autoplay bloqueado:", err));
    }

    // O vídeo tem cerca de 3-5 segundos, ajustamos o tempo de saída
    const exitTimer = setTimeout(() => setExiting(true), 4000);
    const navigateTimer = setTimeout(() => navigate({ to: "/home" }), 4800);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div
      className={[
        "fixed inset-0 overflow-hidden bg-black",
        "animate-[vexia-fade_500ms_ease-out]",
        exiting ? "animate-[splash-cinematic-exit_800ms_cubic-bezier(0.65,0,0.35,1)_forwards]" : "",
      ].join(" ")}
    >
      <h1 className="sr-only">{BRAND.name} — iniciando</h1>

      {/* Splash em Vídeo */}
      <video
        ref={videoRef}
        src={splashVideoAsset.url}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        onEnded={() => setExiting(true)}
      />

      <style>{`
        @keyframes vexia-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes splash-cinematic-exit {
          0%   { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.05); filter: blur(10px); }
        }
      `}</style>
    </div>
  );
}
