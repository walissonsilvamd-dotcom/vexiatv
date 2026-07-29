import { createFileRoute } from "@tanstack/react-router";
import splashAsset from "../assets/splash-clean.jpeg.asset.json";

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
    const id = setTimeout(() => navigate({ to: "/home" }), 3200);
    return () => clearTimeout(id);
  }, [navigate]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <img
        src={splashAsset.url}
        alt="VÉXIA TV — Carregando"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Spinner segmentado animado, no mesmo lugar do original, acima de "CARREGANDO..." */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "78%" }}
      >
        <div
          className="h-12 w-12 rounded-full animate-[splash-spin_1.1s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, #a855f7 0deg, #7c3aed 60deg, #4f46e5 130deg, #3b82f6 200deg, #22d3ee 280deg, transparent 320deg, transparent 360deg)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            filter: "drop-shadow(0 0 10px rgba(168,85,247,0.6))",
          }}
        />
      </div>
      <style>{`
        @keyframes splash-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
