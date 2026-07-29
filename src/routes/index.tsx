import { createFileRoute } from "@tanstack/react-router";
import splashAsset from "../assets/splash.jpeg.asset.json";

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
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <img
        src={splashAsset.url}
        alt="VÉXIA TV — Carregando"
        className="h-full w-full object-cover animate-[splash-pulse_2.4s_ease-in-out_infinite]"
        draggable={false}
      />
      <style>{`
        @keyframes splash-pulse {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.08) saturate(1.15); }
        }
      `}</style>
    </div>
  );
}
