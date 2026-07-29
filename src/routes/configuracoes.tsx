import { createFileRoute } from "@tanstack/react-router";
import {
  Captions,
  Clock,
  Eraser,
  Globe,
  Layout,
  ListVideo,
  MonitorPlay,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { SectionTitle } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { DEVICE_KEY, DEVICE_MAC } from "../data/vexia-catalog";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Configurações" },
      {
        name: "description",
        content: "Ajustes do VÉXIA TV: listas, idioma, player, legendas e dados do dispositivo.",
      },
      { property: "og:title", content: "VÉXIA TV — Configurações" },
      { property: "og:description", content: "Ajustes e preferências do VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type Row =
  | { kind: "toggle"; icon: LucideIcon; label: string; key: string }
  | { kind: "value"; icon: LucideIcon; label: string; value: string }
  | { kind: "action"; icon: LucideIcon; label: string; action?: "playlist" };

const ROWS: Row[] = [
  { kind: "toggle", icon: ShieldCheck, label: "Controle dos Pais", key: "parental" },
  { kind: "action", icon: ListVideo, label: "Gerenciar Listas", action: "playlist" },
  { kind: "value", icon: Globe, label: "Idioma e Região", value: "PT-BR" },
  { kind: "value", icon: Layout, label: "Estilo de Interface", value: "Vertical" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Categorias", key: "hideCat" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar VOD", key: "hideVod" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Séries", key: "hideSeries" },
  { kind: "action", icon: Trash2, label: "Limpar Histórico de Filmes" },
  { kind: "action", icon: Eraser, label: "Limpar Histórico de Séries" },
  { kind: "value", icon: PlayCircle, label: "Player de Vídeo", value: "Integrado" },
  { kind: "toggle", icon: RefreshCw, label: "Atualização Automática", key: "autoUpdate" },
  { kind: "value", icon: Clock, label: "Formato de Hora", value: "24h" },
  { kind: "action", icon: Captions, label: "Configurações de Legenda" },
];

function SettingsPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    parental: false,
    hideCat: false,
    hideVod: false,
    hideSeries: false,
    autoUpdate: true,
  });
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader showFilters={false} />

      <div className="space-y-4 px-5 md:px-10">
        <SectionTitle>⚙ CONFIGURAÇÕES</SectionTitle>

        <ul className="overflow-hidden rounded-xl bg-vexia-card">
          {ROWS.map((row, i) => {
            const Icon = row.icon;
            return (
              <li key={row.label} className={i > 0 ? "border-t border-[#2A2A2A]" : ""}>
                <button
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onClick={() => {
                    if (row.kind === "toggle") {
                      setToggles((t) => ({ ...t, [row.key]: !t[row.key] }));
                    } else if (row.kind === "action" && row.action === "playlist") {
                      setQrOpen(true);
                    }
                  }}
                  className="vexia-focus flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-vexia-purple-soft" aria-hidden />
                  <span className="flex-1 text-sm font-medium text-vexia-text">{row.label}</span>
                  {row.kind === "value" ? (
                    <span className="text-xs text-vexia-muted">{row.value}</span>
                  ) : null}
                  {row.kind === "toggle" ? (
                    <span
                      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                        toggles[row.key] ? "bg-vexia-purple" : "bg-black/60"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          toggles[row.key] ? "translate-x-5" : ""
                        }`}
                      />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <section className="space-y-1 rounded-xl bg-vexia-card p-4">
          <h2 className="text-xs font-black tracking-[0.2em] text-vexia-purple-soft">DISPOSITIVO</h2>
          <p className="text-xs text-vexia-cyan">Endereço MAC: {DEVICE_MAC}</p>
          <p className="text-xs text-vexia-cyan">Chave do dispositivo: {DEVICE_KEY}</p>
        </section>

        <div className="flex justify-center pt-2">
          <MonitorPlay className="h-4 w-4 text-vexia-muted" aria-hidden />
        </div>
        <p className="pb-2 text-center text-[11px] text-vexia-muted">VÉXIA TV 1.0</p>
      </div>

      <QrPlaylistDialog open={qrOpen} onClose={() => setQrOpen(false)} />
      <BottomTabs active="Ajustes" />
    </main>
  );
}
