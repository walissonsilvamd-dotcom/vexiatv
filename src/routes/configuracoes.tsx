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
  History,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import {
  ModalButton,
  OptionRow,
  SettingsModal,
  SwitchRow,
} from "../components/vexia/SettingsModal";
import { DEVICE_KEY, DEVICE_MAC } from "../data/vexia-catalog";
import { useSettings } from "../lib/settings-store";
import { usePlaylist } from "../lib/playlist-store";
import { useSort } from "../lib/filters-store";
import {
  clearCompleted,
  clearWatchHistory,
  isHistoryEnabled,
  setHistoryEnabled,
  useWatchHistory,
} from "../lib/history-store";

type Dialog =
  | null
  | "parental"
  | "playlist"
  | "language"
  | "interface"
  | "clearAll"
  | "clearMovies"
  | "clearSeries"
  | "sort"
  | "quality"
  | "player"
  | "timeFormat"
  | "captions"
  | "clearWatched"
  | "historyOff";

type Item =
  | { kind: "toggle"; icon: LucideIcon; label: string; sub: (v: string) => string; key: "hideCategories" | "hideVod" | "hideSeries" | "autoUpdate" }
  | { kind: "action"; icon: LucideIcon; label: string; sub: string; dialog: Exclude<Dialog, null> };

import { TopNav } from "../components/vexia/TopNav";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Ajustes" },
      {
        name: "description",
        content:
          "Ajustes do VÉXIA TV: controle dos pais, listas, idioma, player, legendas, histórico e dados do dispositivo.",
      },
      { property: "og:title", content: "VÉXIA TV — Ajustes" },
      { property: "og:description", content: "Todas as preferências do VÉXIA TV em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const LANGUAGES = [
  { value: "pt-BR", label: "🇧🇷 Português", hint: "Brasil" },
  { value: "en-US", label: "🇺🇸 English", hint: "United States" },
  { value: "es-ES", label: "🇪🇸 Español", hint: "España" },
] as const;

/* Mesmas opções usadas nas telas de Filmes, Séries e Canais. */
const SORTS = [
  { value: "az", label: "A - Z", hint: "Ordem alfabética" },
  { value: "nota", label: "Nota", hint: "Maior avaliação primeiro" },
  { value: "recentes", label: "Mais recentes", hint: "Lançamentos primeiro" },
] as const;

const QUALITIES = [
  { value: "auto", label: "Automático", hint: "Ajusta pela sua conexão" },
  { value: "low", label: "Baixa", hint: "480p — economia de dados" },
  { value: "medium", label: "Média", hint: "720p" },
  { value: "high", label: "Alta", hint: "1080p" },
  { value: "original", label: "Original", hint: "Sem recodificação" },
] as const;

function SettingsPage() {
  const navigate = useNavigate();
  const { settings, set, toggle, history, clearHistory, formatTime } = useSettings();
  const { history: watchHistory } = useWatchHistory();
  const [historyOn, setHistoryOn] = useState(true);
  useEffect(() => setHistoryOn(isHistoryEnabled()), []);
  const { reload } = usePlaylist();
  /* Classificação: mesma preferência aplicada nas listagens do app. */
  const { sort, setSort } = useSort();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [flash, setFlash] = useState("");

  const close = () => {
    setDialog(null);
    setPin("");
    setPinConfirm("");
    setPinError("");
  };

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const savePin = () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setPinError("O PIN deve ter 4 dígitos numéricos.");
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("Os PINs não coincidem.");
      return;
    }
    set("parentalPin", pin);
    set("parentalEnabled", true);
    close();
    notify("Controle dos Pais ativado");
  };

  const ITEMS: Item[] = [
    {
      kind: "action",
      icon: ShieldCheck,
      label: "Controle dos Pais",
      sub: settings.parentalEnabled ? "Ativo — PIN configurado" : "Desativado",
      dialog: "parental",
    },
    { kind: "action", icon: ListVideo, label: "Gerenciar Listas", sub: "Adicionar e atualizar listas", dialog: "playlist" },
    {
      kind: "action",
      icon: Globe,
      label: "Idioma e Região",
      sub: LANGUAGES.find((l) => l.value === settings.language)?.label ?? "Português",
      dialog: "language",
    },
    {
      kind: "action",
      icon: Layout,
      label: "Estilo de Interface",
      sub: settings.displayMode === "horizontal" ? "VÉXIA Dark • Horizontal" : "VÉXIA Dark • Vertical",
      dialog: "interface",
    },
    { kind: "toggle", icon: EyeOff, label: "Ocultar Categorias", sub: (v) => v, key: "hideCategories" },
    { kind: "toggle", icon: EyeOff, label: "Ocultar VOD", sub: (v) => v, key: "hideVod" },
    { kind: "toggle", icon: EyeOff, label: "Ocultar Séries", sub: (v) => v, key: "hideSeries" },
    { kind: "action", icon: Trash2, label: "Limpar Histórico", sub: `${watchHistory.length} itens salvos`, dialog: "clearAll" },
    {
      kind: "action",
      icon: Eraser,
      label: "Limpar Itens Assistidos",
      sub: `${watchHistory.filter((h) => h.completed).length} concluídos`,
      dialog: "clearWatched",
    },
    {
      kind: "action",
      icon: History,
      label: "Histórico de Reprodução",
      sub: historyOn ? "Ativo — salvando progresso" : "Desativado",
      dialog: "historyOff",
    },
    {
      kind: "action",
      icon: Trash2,
      label: "Limpar Filmes",
      sub: `${watchHistory.filter((h) => h.kind === "movie").length} filmes`,
      dialog: "clearMovies",
    },
    {
      kind: "action",
      icon: Eraser,
      label: "Limpar Séries",
      sub: `${watchHistory.filter((h) => h.kind === "series").length} séries`,
      dialog: "clearSeries",
    },
    {
      kind: "action",
      icon: ArrowUpDown,
      label: "Classificação",
      sub: SORTS.find((s) => s.value === sort)?.label ?? "A - Z",
      dialog: "sort",
    },
    {
      kind: "action",
      icon: Wifi,
      label: "Qualidade",
      sub: QUALITIES.find((q) => q.value === settings.quality)?.label ?? "Automático",
      dialog: "quality",
    },
    {
      kind: "action",
      icon: PlayCircle,
      label: "Player de Vídeo",
      sub: settings.player === "internal" ? "Player interno VÉXIA" : "Player externo",
      dialog: "player",
    },
    { kind: "toggle", icon: RefreshCw, label: "Atualização Automática", sub: (v) => v, key: "autoUpdate" },
    { kind: "action", icon: Clock, label: "Formato de Hora", sub: settings.timeFormat === "24h" ? "24 horas" : "12 horas", dialog: "timeFormat" },
    {
      kind: "action",
      icon: Captions,
      label: "Legendas",
      sub: settings.subtitlesEnabled ? "Ativas" : "Desativadas",
      dialog: "captions",
    },
  ];

  return (
    <main className="vexia-safe min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <div className="px-[4vw] pt-5">
        <TopNav active="Ajustes" className="w-fit" />
      </div>
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
          <h1 className="text-2xl font-black tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.55)] md:text-3xl">
            AJUSTES
          </h1>

          <p className="mt-1 text-[11px] font-medium tracking-widest text-[#9CA3AF]">
            {formatTime(new Date())} • Preferências salvas no aparelho
          </p>
        </div>
        <VexiaLogo className="h-10 shrink-0 md:h-14" />
      </header>

      {flash ? (
        <p className="mx-[4vw] mb-4 rounded-xl border border-vexia-cyan/40 bg-vexia-cyan/10 px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-vexia-cyan">
          {flash}
        </p>
      ) : null}

      <div className="px-[4vw]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const isToggle = item.kind === "toggle";
            const active = isToggle ? settings[item.key] : false;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.kind === "toggle") {
                    toggle(item.key);
                    notify(`${item.label}: ${active ? "desativado" : "ativado"}`);
                  } else {
                    setDialog(item.dialog);
                  }
                }}
                className="group vexia-focus relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#141414] p-4 text-left shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-vexia-purple/40 hover:shadow-[0_12px_32px_-8px_rgb(var(--vexia-primary-rgb)/0.35)] focus:scale-[1.02] focus:border-vexia-cyan/60 focus:shadow-[0_0_30px_rgb(var(--vexia-secondary-rgb)/0.25)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-vexia-purple/10 opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />

                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-vexia-purple/25 to-vexia-purple/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-vexia-purple/20 transition-all group-hover:scale-110 group-hover:from-vexia-purple/40 group-hover:shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.35)]">
                  <Icon className="h-6 w-6 text-vexia-purple" aria-hidden strokeWidth={1.5} />
                </span>

                <div className="relative z-10 w-full">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-white drop-shadow">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-snug text-vexia-cyan/70">
                    {isToggle ? (active ? "Ativado" : "Desativado") : item.sub}
                  </p>
                </div>

                {isToggle ? (
                  <span
                    className={`relative z-10 mt-auto flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-all duration-300 ${
                      active
                        ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/70 shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.55)]"
                        : "bg-white/10"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`h-5 w-5 rounded-full shadow-md transition-all duration-300 ${
                        active ? "translate-x-5 bg-white" : "bg-white/70"
                      }`}
                    />
                  </span>
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

      {/* ---------- CONTROLE DOS PAIS ---------- */}
      <SettingsModal
        open={dialog === "parental"}
        title="Controle dos Pais"
        subtitle="Proteja o acesso a conteúdos com um PIN de 4 dígitos."
        onClose={close}
      >
        <SwitchRow
          label="Ativar proteção"
          hint={settings.parentalPin ? "PIN configurado" : "Crie um PIN abaixo"}
          active={settings.parentalEnabled}
          onToggle={() => {
            if (!settings.parentalPin) {
              setPinError("Crie um PIN antes de ativar.");
              return;
            }
            toggle("parentalEnabled");
          }}
        />
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Criar PIN</span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            maxLength={4}
            placeholder="••••"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg tracking-[0.6em] text-white outline-none focus:border-vexia-cyan/60"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Confirmar PIN</span>
          <input
            value={pinConfirm}
            onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            maxLength={4}
            placeholder="••••"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-lg tracking-[0.6em] text-white outline-none focus:border-vexia-cyan/60"
          />
        </label>
        {pinError ? <p className="text-xs font-bold text-red-400">{pinError}</p> : null}
        <div className="flex gap-3 pt-1">
          <ModalButton variant="ghost" onClick={close}>
            Cancelar
          </ModalButton>
          <ModalButton onClick={savePin}>Salvar PIN</ModalButton>
        </div>
      </SettingsModal>

      {/* ---------- IDIOMA ---------- */}
      <SettingsModal
        open={dialog === "language"}
        title="Idioma e Região"
        subtitle="A preferência fica salva no aparelho."
        onClose={close}
      >
        {LANGUAGES.map((l) => (
          <OptionRow
            key={l.value}
            label={l.label}
            hint={l.hint}
            selected={settings.language === l.value}
            onSelect={() => {
              set("language", l.value);
              close();
              notify(`Idioma alterado para ${l.label}`);
            }}
          />
        ))}
      </SettingsModal>

      {/* ---------- INTERFACE ---------- */}
      <SettingsModal
        open={dialog === "interface"}
        title="Estilo de Interface"
        subtitle="Tema e modo de exibição do aplicativo."
        onClose={close}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Tema</p>
        <OptionRow label="VÉXIA Dark" hint="Tema padrão do aplicativo" selected onSelect={() => {}} />
        <p className="pt-2 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Modo de exibição</p>
        <OptionRow
          label="Horizontal"
          hint="Ideal para TV e monitores"
          selected={settings.displayMode === "horizontal"}
          onSelect={() => {
            set("displayMode", "horizontal");
            notify("Modo horizontal aplicado");
          }}
        />
        <OptionRow
          label="Vertical"
          hint="Ideal para celular e tablet"
          selected={settings.displayMode === "vertical"}
          onSelect={() => {
            set("displayMode", "vertical");
            notify("Modo vertical aplicado");
          }}
        />
      </SettingsModal>

      {/* ---------- LIMPAR HISTÓRICO ---------- */}
      <SettingsModal
        open={dialog === "clearAll" || dialog === "clearMovies" || dialog === "clearSeries"}
        title="Tem certeza?"
        subtitle={
          dialog === "clearMovies"
            ? "Isso apaga somente o histórico de filmes assistidos."
            : dialog === "clearSeries"
              ? "Isso apaga somente o histórico de séries assistidas."
              : "Isso apaga o 'Continuar assistindo' e os últimos acessos."
        }
        onClose={close}
      >
        <div className="flex gap-3">
          <ModalButton variant="ghost" onClick={close}>
            Cancelar
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={() => {
              const kind =
                dialog === "clearMovies" ? "movie" : dialog === "clearSeries" ? "series" : undefined;
              clearHistory(kind);
              clearWatchHistory(kind);
              close();
              notify("Histórico limpo com sucesso");
            }}
          >
            Limpar
          </ModalButton>
        </div>
      </SettingsModal>

      {/* ---------- LIMPAR ITENS ASSISTIDOS ---------- */}
      <SettingsModal
        open={dialog === "clearWatched"}
        title="Limpar itens assistidos?"
        subtitle="Remove do histórico somente o que já foi assistido até o fim."
        onClose={close}
      >
        <div className="flex gap-3">
          <ModalButton variant="ghost" onClick={close}>
            Cancelar
          </ModalButton>
          <ModalButton
            variant="danger"
            onClick={() => {
              clearCompleted();
              close();
              notify("Itens assistidos removidos");
            }}
          >
            Limpar
          </ModalButton>
        </div>
      </SettingsModal>

      {/* ---------- DESATIVAR HISTÓRICO ---------- */}
      <SettingsModal
        open={dialog === "historyOff"}
        title="Histórico de Reprodução"
        subtitle="Controle se o VÉXIA TV deve salvar o progresso do que você assiste."
        onClose={close}
      >
        <SwitchRow
          label="Salvar histórico"
          hint="Alimenta o Continuar Assistindo e a tela Histórico"
          active={historyOn}
          onToggle={() => {
            const next = !historyOn;
            setHistoryOn(next);
            setHistoryEnabled(next);
            notify(next ? "Histórico ativado" : "Histórico desativado");
          }}
        />
      </SettingsModal>

      {/* ---------- CLASSIFICAÇÃO ---------- */}
      <SettingsModal
        open={dialog === "sort"}
        title="Classificação de Conteúdo"
        subtitle="Como filmes, séries e canais serão organizados."
        onClose={close}
      >
        {SORTS.map((s) => (
          <OptionRow
            key={s.value}
            label={s.label}
            hint={s.hint}
            selected={sort === s.value}
            onSelect={() => {
              setSort(s.value);
              close();
              notify(`Ordenação: ${s.label}`);
            }}
          />
        ))}
      </SettingsModal>

      {/* ---------- QUALIDADE ---------- */}
      <SettingsModal
        open={dialog === "quality"}
        title="Qualidade de Transmissão"
        subtitle="Define a resolução preferida na reprodução."
        onClose={close}
      >
        {QUALITIES.map((q) => (
          <OptionRow
            key={q.value}
            label={q.label}
            hint={q.hint}
            selected={settings.quality === q.value}
            onSelect={() => {
              set("quality", q.value);
              close();
              notify(`Qualidade: ${q.label}`);
            }}
          />
        ))}
      </SettingsModal>

      {/* ---------- PLAYER ---------- */}
      <SettingsModal
        open={dialog === "player"}
        title="Player de Vídeo"
        subtitle="Escolha o reprodutor e o comportamento padrão."
        onClose={close}
      >
        <OptionRow
          label="Player interno VÉXIA"
          hint="Recomendado — suporte a HLS e legendas"
          selected={settings.player === "internal"}
          onSelect={() => set("player", "internal")}
        />
        <OptionRow
          label="Player externo"
          hint="Abre no app de vídeo do sistema"
          selected={settings.player === "external"}
          onSelect={() => set("player", "external")}
        />
        <SwitchRow
          label="Reprodução automática"
          hint="Inicia o próximo episódio sozinho"
          active={settings.autoPlay}
          onToggle={() => toggle("autoPlay")}
        />
        <SwitchRow
          label="Troca imediata de episódio"
          hint="Sem confirmação ao escolher outro episódio no carrossel"
          active={settings.episodeQuickSwitch}
          onToggle={() => toggle("episodeQuickSwitch")}
        />

        <SwitchRow
          label="Legendas por padrão"
          hint="Ativa legendas ao abrir o player"
          active={settings.subtitlesEnabled}
          onToggle={() => toggle("subtitlesEnabled")}
        />
      </SettingsModal>

      {/* ---------- FORMATO DE HORA ---------- */}
      <SettingsModal
        open={dialog === "timeFormat"}
        title="Formato de Hora"
        subtitle="Usado no relógio da Home e nos horários da grade."
        onClose={close}
      >
        <OptionRow
          label="24 horas"
          hint={`Exemplo: ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })}`}
          selected={settings.timeFormat === "24h"}
          onSelect={() => {
            set("timeFormat", "24h");
            close();
            notify("Formato 24 horas aplicado");
          }}
        />
        <OptionRow
          label="12 horas"
          hint={`Exemplo: ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`}
          selected={settings.timeFormat === "12h"}
          onSelect={() => {
            set("timeFormat", "12h");
            close();
            notify("Formato 12 horas aplicado");
          }}
        />
      </SettingsModal>

      {/* ---------- LEGENDAS ---------- */}
      <SettingsModal
        open={dialog === "captions"}
        title="Configurações de Legenda"
        subtitle="Aparência das legendas durante a reprodução."
        onClose={close}
      >
        <SwitchRow
          label="Ativar legenda automática"
          active={settings.subtitlesEnabled}
          onToggle={() => toggle("subtitlesEnabled")}
        />
        <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Tamanho</p>
        {(["small", "medium", "large"] as const).map((size) => (
          <OptionRow
            key={size}
            label={size === "small" ? "Pequena" : size === "medium" ? "Média" : "Grande"}
            selected={settings.subtitleSize === size}
            onSelect={() => set("subtitleSize", size)}
          />
        ))}
        <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">Cor</p>
        {(["white", "yellow"] as const).map((color) => (
          <OptionRow
            key={color}
            label={color === "white" ? "Branco" : "Amarelo"}
            selected={settings.subtitleColor === color}
            onSelect={() => set("subtitleColor", color)}
          />
        ))}
        <div
          className="rounded-xl border border-white/10 bg-black/60 p-4 text-center font-bold"
          style={{
            color: settings.subtitleColor === "yellow" ? "#FFD34D" : "#FFFFFF",
            fontSize:
              settings.subtitleSize === "small" ? 12 : settings.subtitleSize === "large" ? 22 : 16,
          }}
        >
          Prévia da legenda
        </div>
      </SettingsModal>

      <QrPlaylistDialog
        open={dialog === "playlist"}
        onClose={() => {
          close();
          if (settings.autoUpdate) void reload();
        }}
      />
    </main>
  );
}
