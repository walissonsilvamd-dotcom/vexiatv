import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
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
  ArrowUpDown,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { DEVICE_KEY, DEVICE_MAC } from "../data/vexia-catalog";

type Item =
  | { kind: "toggle"; icon: LucideIcon; label: string; sub: string; key: string }
  | { kind: "action"; icon: LucideIcon; label: string; sub: string; action: string };

const ITEMS: Item[] = [
  { kind: "toggle", icon: ShieldCheck, label: "Controle dos Pais", sub: "PIN protection", key: "parental" },
  { kind: "action", icon: ListVideo, label: "Gerenciar Listas", sub: "Favorites and custom lists", action: "playlist" },
  { kind: "action", icon: Globe, label: "Idioma e Região", sub: "PT-BR", action: "language" },
  { kind: "action", icon: Layout, label: "Estilo de Interface", sub: "Vertical/Horizontal", action: "interface" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Categorias", sub: "Customizable", key: "hideCat" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar VOD", sub: "Manage VOD visibility", key: "hideVod" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Séries", sub: "Manage Series visibility", key: "hideSeries" },
  { kind: "action", icon: Trash2, label: "Limpar Histórico", sub: "All playback history", action: "clearAll" },
  { kind: "action", icon: Trash2, label: "Limpar Histórico de Filmes", sub: "Clear movie history", action: "clearMovies" },
  { kind: "action", icon: Eraser, label: "Limpar Histórico de Séries", sub: "Clear series history", action: "clearSeries" },
  { kind: "action", icon: ArrowUpDown, label: "Classificação de Conteúdo", sub: "Alphabetical/Date added", action: "sort" },
  { kind: "action", icon: Wifi, label: "Qualidade de Transmissão", sub: "Auto/Manual", action: "quality" },
  { kind: "action", icon: PlayCircle, label: "Player de Vídeo", sub: "Built-in/External", action: "player" },
  { kind: "toggle", icon: RefreshCw, label: "Atualização Automática", sub: "Toggle", key: "autoUpdate" },
  { kind: "action", icon: Clock, label: "Formato de Hora", sub: "12h/24h", action: "timeFormat" },
  { kind: "action", icon: Captions, label: "Configurações de Legenda", sub: "Size, color, delay", action: "captions" },
];

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

function SettingsPage() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    parental: false,
    hideCat: false,
    hideVod: false,
    hideSeries: false,
    autoUpdate: true,
  });
  const [qrOpen, setQrOpen] = useState(false);

  const handleAction = (action: string) => {
    if (action === "playlist") setQrOpen(true);
    // Ações futuras: language, interface, clearAll, etc.
  };

  return (
    <main className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      {/* Cabeçalho estilo TV */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-[4vw] py-5">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Voltar"
          className="vexia-focus grid h-11 w-11 shrink-0 place-items-center rounded-full border border-vexia-purple/50 bg-black/50"
        >
          <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-[0.12em] text-vexia-purple md:text-3xl">
            CONFIGURAÇÕES
          </h1>
        </div>
        <VexiaLogo className="h-10 shrink-0 md:h-14" />
      </header>

      <div className="px-[4vw]">
        {/* Grid de cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isToggle = item.kind === "toggle";
            const active = isToggle ? toggles[item.key] : false;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.kind === "toggle") {
                    setToggles((t) => ({ ...t, [item.key]: !t[item.key] }));
                  } else {
                    handleAction(item.action);
                  }
                }}
                className="vexia-focus flex flex-col items-start gap-2.5 rounded-2xl border border-white/10 bg-[#1A1A1A] p-4 text-left transition-colors hover:border-vexia-purple/40"
              >
                <Icon className="h-6 w-6 text-vexia-purple" aria-hidden strokeWidth={1.5} />
                <div className="w-full">
                  <p className="text-sm font-bold leading-tight text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[#B0B0B0]">{item.sub}</p>
                </div>
                {isToggle ? (
                  <span
                    className={`mt-1 flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                      active ? "bg-vexia-purple" : "bg-[#B0B0B0]/40"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white transition-transform ${
                        active ? "translate-x-5" : ""
                      }`}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Info do dispositivo */}
        <section className="mt-8 space-y-1 text-center">
          <p className="text-sm font-bold text-vexia-cyan">
            Endereço MAC: {DEVICE_MAC}
          </p>
          <p className="text-sm font-bold text-vexia-cyan">
            Chave do dispositivo: {DEVICE_KEY}
          </p>
          <p className="text-xs text-[#B0B0B0]">Versão do app: 1.0.3 (Build 240515)</p>
        </section>

        <div className="mt-6 flex justify-center">
          <MonitorPlay className="h-4 w-4 text-vexia-muted" aria-hidden />
        </div>
        <p className="pb-4 text-center text-[11px] text-vexia-muted">VÉXIA TV 1.0</p>
      </div>

      <QrPlaylistDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </main>
  );
}
