import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TopMenu, type MenuAction } from "../components/vexia/TopMenu";
import { HeroCarousel } from "../components/vexia/HeroCarousel";
import { MediaRow } from "../components/vexia/MediaRow";
import { ChannelRow } from "../components/vexia/ChannelRow";
import { ExitDialog, ReloadOverlay } from "../components/vexia/Overlays";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import {
  channels,
  featured,
  featuredMovies,
  featuredSeries,
  recentMovies,
  recentSeries,
} from "../data/vexia";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Home" },
      {
        name: "description",
        content:
          "Protótipo da Home do VÉXIA TV: carrossel cinematográfico, canais ao vivo, filmes e séries com navegação por foco.",
      },
      { property: "og:title", content: "VÉXIA TV — Home" },
      {
        property: "og:description",
        content: "Protótipo visual da Home do VÉXIA TV para Android TV e Smart TV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);

  const [reload, setReload] = useState<"idle" | "loading" | "done">("idle");
  const [exiting, setExiting] = useState(false);

  const handleAction = (action: MenuAction) => {
    if (action === "exit") {
      setExiting(true);
      return;
    }
    setReload("loading");
    setTimeout(() => setReload("done"), 2200);
    setTimeout(() => setReload("idle"), 4000);
  };

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg text-vexia-text">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(65% 55% at 12% -5%, color-mix(in oklab, var(--vexia-purple) 40%, transparent), transparent 70%), radial-gradient(60% 50% at 92% 5%, color-mix(in oklab, var(--vexia-cyan) 24%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-6 py-6 md:px-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <VexiaLogo className="h-16" />
          <TopMenu navRow={0} onAction={handleAction} />
        </header>

        <div className="mt-6">
          <HeroCarousel items={featured} navRow={1} />
        </div>

        <div className="mt-8 space-y-6 pb-16">
          <ChannelRow title="TV AO VIVO" channels={channels} navRow={2} />
          <MediaRow title="FILMES EM DESTAQUE" items={featuredMovies} navRow={3} />
          <MediaRow title="FILMES RECENTES" items={recentMovies} navRow={4} />
          <MediaRow title="SÉRIES EM DESTAQUE" items={featuredSeries} navRow={5} />
          <MediaRow title="SÉRIES RECENTES" items={recentSeries} navRow={6} />
        </div>

        <p className="pb-8 text-center text-[11px] text-vexia-muted">
          Protótipo visual — dados de exemplo. No APK, o conteúdo vem da playlist e o TMDB
          complementa informações ausentes.
        </p>
      </div>

      {reload !== "idle" ? <ReloadOverlay done={reload === "done"} /> : null}
      {exiting ? <ExitDialog onCancel={() => setExiting(false)} /> : null}
    </main>
  );
}
