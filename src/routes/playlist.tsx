import { createFileRoute } from "@tanstack/react-router";
import { ListVideo, Link2, Upload } from "lucide-react";
import { PageShell } from "../components/vexia/PageShell";

export const Route = createFileRoute("/playlist")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Trocar Playlist" },
      { name: "description", content: "Gerencie a playlist usada pelo VÉXIA TV (protótipo)." },
      { property: "og:title", content: "VÉXIA TV — Trocar Playlist" },
      { property: "og:description", content: "Gerenciamento de playlist do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaylistPage,
});

const options = [
  { icon: Link2, title: "URL da playlist", desc: "Cole um link M3U ou Xtream Codes." },
  { icon: Upload, title: "Arquivo local", desc: "Carregue um arquivo .m3u do dispositivo." },
  { icon: ListVideo, title: "Playlists salvas", desc: "Alterne entre listas já configuradas." },
];

function PlaylistPage() {
  return (
    <PageShell title="TROCAR PLAYLIST" subtitle="Tela de placeholder — sem lógica real ainda.">
      <div className="grid gap-4 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.title}
              type="button"
              tabIndex={0}
              className="vexia-focus rounded-2xl border border-white/10 bg-vexia-card p-6 text-left"
            >
              <Icon className="h-6 w-6 text-vexia-cyan" aria-hidden />
              <h2 className="mt-4 text-base font-bold">{option.title}</h2>
              <p className="mt-1 text-sm text-vexia-muted">{option.desc}</p>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
