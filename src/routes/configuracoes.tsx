import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Languages, Gauge, ShieldCheck, Info } from "lucide-react";
import { PageShell } from "../components/vexia/PageShell";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Configurações" },
      { name: "description", content: "Preferências de player, idioma e conta no VÉXIA TV." },
      { property: "og:title", content: "VÉXIA TV — Configurações" },
      { property: "og:description", content: "Preferências do aplicativo VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const groups = [
  { icon: Monitor, title: "Player", desc: "Decodificação, proporção e buffer." },
  { icon: Languages, title: "Idioma e legendas", desc: "Preferências de áudio e legenda." },
  { icon: Gauge, title: "Desempenho", desc: "Cache de imagens e pré-carregamento." },
  { icon: ShieldCheck, title: "Controle dos pais", desc: "Bloqueio por PIN e categorias." },
  { icon: Info, title: "Sobre", desc: "VÉXIA TV 1.0 — protótipo." },
];

function SettingsPage() {
  return (
    <PageShell title="CONFIGURAÇÕES" subtitle="Tela de placeholder — opções ainda não funcionais.">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <button
              key={group.title}
              type="button"
              tabIndex={0}
              className="vexia-focus flex items-start gap-4 rounded-2xl border border-white/10 bg-vexia-card p-6 text-left"
            >
              <Icon className="mt-0.5 h-6 w-6 shrink-0 text-vexia-cyan" aria-hidden />
              <span>
                <span className="block text-base font-bold">{group.title}</span>
                <span className="mt-1 block text-sm text-vexia-muted">{group.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
