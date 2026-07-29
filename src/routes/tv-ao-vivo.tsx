import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../components/vexia/PageShell";
import { ChannelRow } from "../components/vexia/ChannelRow";
import { channels } from "../data/vexia";

export const Route = createFileRoute("/tv-ao-vivo")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — TV ao Vivo" },
      { name: "description", content: "Protótipo da área de canais ao vivo do VÉXIA TV." },
      { property: "og:title", content: "VÉXIA TV — TV ao Vivo" },
      { property: "og:description", content: "Área de canais ao vivo do VÉXIA TV (protótipo)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  return (
    <PageShell
      title="TV AO VIVO"
      subtitle="Canais de exemplo. No APK, a lista será carregada da playlist real."
    >
      <ChannelRow title="TODOS OS CANAIS" channels={channels} navRow={1} />
      <ChannelRow title="MAIS ASSISTIDOS" channels={[...channels].reverse()} navRow={2} />
    </PageShell>
  );
}
