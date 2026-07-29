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
  { kind: "toggle", icon: ShieldCheck, label: "Controle dos Pais", sub: "Bloqueie conteúdo com PIN", key: "parental" },
  { kind: "action", icon: ListVideo, label: "Gerenciar Listas", sub: "Adicione e atualize suas listas", action: "playlist" },
  { kind: "action", icon: Globe, label: "Idioma e Região", sub: "Português (Brasil)", action: "language" },
  { kind: "action", icon: Layout, label: "Estilo de Interface", sub: "Vertical / Horizontal", action: "interface" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Categorias", sub: "Personalize o menu principal", key: "hideCat" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar VOD", sub: "Esconda a seção de vídeos", key: "hideVod" },
  { kind: "toggle", icon: EyeOff, label: "Ocultar Séries", sub: "Esconda a seção de séries", key: "hideSeries" },
  { kind: "action", icon: Trash2, label: "Limpar Histórico", sub: "Apagar todo histórico", action: "clearAll" },
  { kind: "action", icon: Trash2, label: "Limpar Filmes", sub: "Remover histórico de filmes", action: "clearMovies" },
  { kind: "action", icon: Eraser, label: "Limpar Séries", sub: "Remover histórico de séries", action: "clearSeries" },
  { kind: "action", icon: ArrowUpDown, label: "Classificação", sub: "Alfabética / Adicionados", action: "sort" },
  { kind: "action", icon: Wifi, label: "Qualidade", sub: "Automática / Manual", action: "quality" },
  { kind: "action", icon: PlayCircle, label: "Player de Vídeo", sub: "Interno / Externo", action: "player" },
  { kind: "toggle", icon: RefreshCw, label: "Atualização Automática", sub: "Sincroniza as listas", key: "autoUpdate" },
  { kind: "action", icon: Clock, label: "Formato de Hora", sub: "12h / 24h", action: "timeFormat" },
  { kind: "action", icon: Captions, label: "Legendas", sub: "Tamanho, cor e atraso", action: "captions" },
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

function Toggle({ active }: { active: boolean }) {
  return (
    <span
      className={`relative mt-1 flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/70 shadow-[0_0_12px_rgba(123,47,190,0.55)]"
          : "bg-white/10"
      }`}
      aria-hidden
    >
      <span
        className={`h-5 w-5 rounded-full shadow-md transition-all duration-300 ${
          active
            ? "translate-x-5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            : "translate-x-0 bg-white/70"
        }`}
      />
    </span>
  );
}

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
  };

  return (
    <main className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      {/* Cabeçalho estilo TV */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-[4vw] py-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Voltar"
          className="vexia-focus grid h-12 w-12 shrink-0 place-items-center rounded-full border border-vexia-purple/40 bg-black/40 backdrop-blur-md transition-all hover:border-vexia-cyan/60 hover:bg-vexia-purple/20"
        >
          <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-[0.18em] text-white md:text-3xl">
            <span className="text-vexia-purple">CONFIG</span>
            <span className="text-vexia-cyan">URAÇÕES</span>
          </h1>
        </div>
        <VexiaLogo className="h-10 shrink-0 md:h-14" />
      </header>

      <div className="px-[4vw]">
        {/* Grid de cards premium */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
                className="group vexia-focus relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#141414] p-4 text-left shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-vexia-purple/40 hover:shadow-[0_12px_32px_-8px_rgba(123,47,190,0.35)] focus:scale-[1.02] focus:border-vexia-cyan/60 focus:shadow-[0_0_30px_rgba(0,200,255,0.25)]"
              >
                {/* reflexo de luz no topo */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-vexia-purple/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />

                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-vexia-purple/25 to-vexia-purple/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-vexia-purple/20 transition-all group-hover:scale-110 group-hover:from-vexia-purple/40 group-hover:shadow-[0_0_20px_rgba(123,47,190,0.35)]">
                  <Icon className="h-6 w-6 text-vexia-purple" aria-hidden strokeWidth={1.5} />
                </span>

                <div className="relative z-10 w-full">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-white drop-shadow">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-snug text-[#9CA3AF]">
                    {item.sub}
                  </p>
                </div>

                {isToggle ? (
                  <div className="relative z-10 mt-auto w-full pt-1">
                    <Toggle active={active} />
                  </div>
                ) : (
                  <span className="pointer-events-none mt-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-vexia-cyan/70 opacity-0 transition-opacity group-hover:opacity-100">
                    ABRIR
                    <span className="h-1.5 w-1.5 rounded-full bg-vexia-cyan" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info do dispositivo */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#0E0E0E] p-5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-black/30 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Endereço MAC</p>
              <p className="mt-1 text-sm font-black text-vexia-cyan">{DEVICE_MAC}</p>
            </div>
            <div className="rounded-xl bg-black/30 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Chave do dispositivo</p>
              <p className="mt-1 text-sm font-black text-vexia-cyan">{DEVICE_KEY}</p>
            </div>
            <div className="rounded-xl bg-black/30 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Versão do app</p>
              <p className="mt-1 text-sm font-black text-vexia-cyan">1.0.3 (Build 240515)</p>
            </div>
          </div>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2">
          <MonitorPlay className="h-4 w-4 text-vexia-muted" aria-hidden />
          <p className="text-[11px] font-bold tracking-widest text-vexia-muted">VÉXIA TV 1.0</p>
        </div>
      </div>

      <QrPlaylistDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </main>
  );
}

