import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Captions,
  PictureInPicture2,
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
  | "playback"
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
  const pageRef = useRef<HTMLElement>(null);
  useSpatialNav(pageRef);
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
    {
      kind: "action",
      icon: PictureInPicture2,
      label: "Reprodução",
      sub: `Avanço ${settings.seekStep}s${settings.pipEnabled ? " • PiP" : ""}`,
      dialog: "playback",
    },
  ];

  return (
    <main
      ref={pageRef}
      className="vexia-safe flex h-screen flex-col overflow-hidden bg-vexia-bg text-vexia-text"
    >
      <div className="shrink-0 px-[4vw] pt-3">
        <TopNav active="Ajustes" className="w-fit" />
      </div>
      <header className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-[4vw] py-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          aria-label="Voltar"
          className="vexia-focus grid h-10 w-10 shrink-0 place-items-center rounded-full border border-vexia-purple/40 bg-black/40 backdrop-blur-md transition-all hover:border-vexia-cyan/60 hover:bg-vexia-purple/20"
        >
          <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
        </button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-xl font-black tracking-[0.18em] text-white drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.55)] md:text-2xl">
            AJUSTES
          </h1>
          <p className="mt-0.5 truncate text-[10px] font-medium tracking-widest text-[#9CA3AF]">
            {formatTime(new Date())} • Preferências salvas no aparelho
          </p>
        </div>
        <VexiaLogo className="h-9 shrink-0 md:h-12" />
      </header>

      {flash ? (
        <p className="mx-[4vw] mb-2 shrink-0 truncate rounded-xl border border-vexia-cyan/40 bg-vexia-cyan/10 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-vexia-cyan">
          {flash}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-[4vw] pb-2">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
                className="group vexia-focus relative flex min-h-0 flex-col items-start justify-between gap-1 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#141414] p-2 text-left shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:border-vexia-purple/40 hover:shadow-[0_12px_32px_-8px_rgb(var(--vexia-primary-rgb)/0.35)] focus:scale-[1.03] focus:border-vexia-cyan/60 focus:shadow-[0_0_30px_rgb(var(--vexia-secondary-rgb)/0.25)]"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-vexia-purple/10 opacity-60 blur-2xl transition-opacity group-hover:opacity-100" />

                <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-vexia-purple/25 to-vexia-purple/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ring-1 ring-vexia-purple/20 transition-all group-hover:from-vexia-purple/40 group-hover:shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.35)]">
                  <Icon className="h-4 w-4 text-vexia-purple" aria-hidden strokeWidth={1.5} />
                </span>

                <div className="relative z-10 w-full min-w-0">
                  <p className="break-words text-[11px] font-extrabold uppercase leading-tight tracking-tight text-white drop-shadow">
                    {item.label}
                  </p>
                  <p className="break-words text-[10px] font-medium leading-tight text-vexia-cyan/70">
                    {isToggle ? (active ? "Ativado" : "Desativado") : item.sub}
                  </p>
                </div>

                {isToggle ? (
                  <span
                    className={`relative z-10 flex h-4 w-8 shrink-0 items-center rounded-full p-0.5 transition-all duration-300 ${
                      active
                        ? "bg-gradient-to-r from-vexia-purple to-vexia-purple/70 shadow-[0_0_12px_rgb(var(--vexia-primary-rgb)/0.55)]"
                        : "bg-white/10"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`h-3 w-3 rounded-full shadow-md transition-all duration-300 ${
                        active ? "translate-x-3.5 bg-white" : "bg-white/70"
                      }`}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <section className="shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#0E0E0E] px-3 py-1.5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-4">
            <div className="min-w-0 rounded-xl bg-black/30 px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">MAC</p>
              <p className="truncate text-[11px] font-black text-vexia-cyan">{DEVICE_MAC}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-black/30 px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Chave</p>
              <p className="truncate text-[11px] font-black text-vexia-cyan">{DEVICE_KEY}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-black/30 px-2 py-1.5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Versão</p>
              <p className="truncate text-[11px] font-black text-vexia-cyan">1.0.3 (240515)</p>
            </div>
            <div className="flex min-w-0 items-center justify-center gap-1.5">
              <MonitorPlay className="h-3.5 w-3.5 shrink-0 text-vexia-muted" aria-hidden />
              <p className="truncate text-[10px] font-bold tracking-widest text-vexia-muted">
                VÉXIA TV 1.0
              </p>
            </div>
          </div>
        </section>
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
        <SwitchRow
          label="Caixa escura atrás do texto"
          active={settings.subtitleBackdrop}
          onToggle={() => toggle("subtitleBackdrop")}
        />
        <div
          className="rounded-xl border border-white/10 bg-black/60 p-4 text-center font-bold"
          style={{
            color: settings.subtitleColor === "yellow" ? "#FFD34D" : "#FFFFFF",
            fontSize:
              settings.subtitleSize === "small" ? 12 : settings.subtitleSize === "large" ? 22 : 16,
          }}
        >
          <span
            style={{
              background: settings.subtitleBackdrop ? "rgba(0,0,0,0.55)" : "transparent",
              textShadow: "0 2px 6px rgba(0,0,0,0.9)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            Prévia da legenda
          </span>
        </div>
      </SettingsModal>

      {/* ---------- REPRODUÇÃO ---------- */}
      <SettingsModal
        open={dialog === "playback"}
        title="Reprodução"
        subtitle="Passo de avanço, janela flutuante e confirmação de saída."
        onClose={close}
      >
        <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
          Avançar / voltar
        </p>
        {([5, 10, 15, 30] as const).map((step) => (
          <OptionRow
            key={step}
            label={`${step} segundos`}
            selected={settings.seekStep === step}
            onSelect={() => set("seekStep", step)}
          />
        ))}
        {/* Perfil de desempenho: quanto o player pode encher o buffer/qualidade. */}
        <p className="pt-3 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]">
          Desempenho do player
        </p>
        {(
          [
            ["eco", "Econômico — TV/box mais fraco"],
            ["balanced", "Equilibrado (recomendado)"],
            ["smooth", "Fluido — internet boa"],
          ] as const
        ).map(([value, label]) => (
          <OptionRow
            key={value}
            label={label}
            selected={settings.perfProfile === value}
            onSelect={() => set("perfProfile", value)}
          />
        ))}
        <SwitchRow
          label="Janela flutuante (PiP)"
          active={settings.pipEnabled}
          onToggle={() => toggle("pipEnabled")}
        />
        <SwitchRow
          label="Confirmar antes de sair do app"
          active={settings.confirmExit}
          onToggle={() => toggle("confirmExit")}
        />

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
