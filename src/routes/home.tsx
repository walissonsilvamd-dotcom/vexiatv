import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type React from "react";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import {
  Clapperboard,
  Clock,
  ListVideo,
  Menu,
  Move,
  PlayCircle,
  Settings,
  Trophy,
  SlidersHorizontal,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import heroAsset from "../assets/hero-odisseia.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { usePlaylist } from "../lib/playlist-store";
import { useSettings } from "../lib/settings-store";
import { useTmdbHeroes } from "../lib/use-tmdb";
import type { MediaItem } from "../data/vexia";
import { removeWatch, useContinueWatching } from "../lib/history-store";
import { clearLastSession, useLastSession } from "../lib/last-session";
import { clearProgress } from "../lib/progress-store";
import { useOpenWatch, useResolvedHistory, WatchCard } from "../components/vexia/WatchCard";
import { DiscoverRows } from "../components/vexia/DiscoverRows";
import type { ResolvedWatch } from "../components/vexia/WatchCard";
import { ConfirmDialog } from "../components/vexia/ConfirmDialog";
import { preloadImage, preloadImages } from "../lib/image";
import { SmartImage } from "../components/vexia/SmartImage";
import { BRAND } from "../lib/brand";
import { isAdultText } from "../lib/parental";
import { useBackgroundStore } from "../lib/background-store";


export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Home` },
      {
        name: "description",
        content:
          `Home do ${BRAND.name}: destaque em tela cheia com canais, filmes, séries, jogos, listas e ajustes.`,
      },
      { property: "og:title", content: `${BRAND.name} — Home` },
      { property: "og:description", content: `Home do ${BRAND.name} para Android TV e Smart TV.` },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/home" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/home" }],
  }),
  component: HomePage,
});

type Hero = {
  title: string;
  year: number;
  release: string;
  genres: string[];
  runtime: string;
  votes: number;
  stars: number;
  image: string;
  overview: string;
};

const FALLBACK_HERO: Hero = {
  title: "CARREGUE SUA LISTA",
  year: new Date().getFullYear(),
  release: "Menu LISTAS",
  genres: ["CANAIS", "FILMES", "SÉRIES"],
  runtime: "M3U / M3U8",
  votes: 0,
  stars: 0,
  image: heroAsset.url,
  overview:
    "Adicione sua lista M3U pelo menu LISTAS para preencher canais, filmes e séries com capas, sinopses e destaques automáticos.",
};

type Tile = {
  label: string;
  icon: LucideIcon;
  to?: string;
  action?: "lists";
  hideKey?: "hideVod" | "hideSeries";
};

const TILES: Tile[] = [
  { label: "CANAIS", icon: Tv, to: "/canais" },
  { label: "FILMES", icon: PlayCircle, to: "/filmes", hideKey: "hideVod" },
  { label: "SÉRIES", icon: Clapperboard, to: "/series", hideKey: "hideSeries" },
  { label: "FILTROS", icon: SlidersHorizontal, to: "/filtros" },
  { label: "LISTAS", icon: ListVideo, to: "/listas" },
  { label: "JOGOS", icon: Trophy, to: "/jogos" },
  { label: "AJUSTES", icon: Settings, to: "/configuracoes" },
];

function HomePage() {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  useSpatialNav(pageRef);
  const [active, setActive] = useState(0);
  const [listsOpen, setListsOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ResolvedWatch | null>(null);
  /* Confirmação de saída (padrão dos apps de TV): Voltar na Home pergunta antes. */
  const [exitOpen, setExitOpen] = useState(false);
  const { movies, series, channels, hasContent } = usePlaylist();
  const { settings, formatTime } = useSettings();
  const { currentBackdrop, currentTitle, currentYear, currentGenres } = useBackgroundStore();


  // Continuar assistindo: histórico local reconciliado com a lista atual.
  const continueEntries = useContinueWatching(15);
  const continueList = useResolvedHistory(continueEntries);
  const openWatch = useOpenWatch();

  // Última sessão salva: restaura automaticamente o episódio/filme ao reabrir.
  const lastSession = useLastSession();



  // Blocos visíveis respeitando "Ocultar VOD" e "Ocultar Séries" dos Ajustes.
  const tiles = useMemo(
    () => TILES.filter((t) => !t.hideKey || !settings[t.hideKey]),
    [settings],
  );


  // Pool de destaques: 20 títulos aleatórios entre os mais bem avaliados (>= 2025)
  // Filtra conteúdo adulto e prioriza lançamentos
  const heroPool = useMemo<MediaItem[]>(() => {
    const all = [...movies, ...series]
      .filter((m) => m.poster) // Apenas com capa certinha
      .filter((m) => !isAdultText(m.title, m.category, ...(m.genres || [])))
      .filter((m) => (m.year || 0) >= 2025)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 50); // Pega os 50 melhores

    // Embaralha para pegar 20 aleatórios
    return [...all].sort(() => Math.random() - 0.5).slice(0, 20);
  }, [movies, series]);

  // Enriquece os destaques com TMDB
  const enrichedHeroes = useTmdbHeroes(heroPool, "movie");

  const slides = useMemo<Hero[]>(() => {
    return enrichedHeroes.map((m) => ({
      title: m.title.toUpperCase(),
      year: m.year,
      release: m.genres[0] ?? "LANÇAMENTO",
      genres: m.genres.slice(0, 3).map((g) => g.toUpperCase()),
      runtime: m.seasons ? `${m.seasons} TEMPORADAS` : "FILME",
      votes: m.rating,
      stars: Math.round(m.rating),
      image: (m.poster) as string, // Prioriza poster estático sem corte
      overview: m.overview ?? "",
    }));
  }, [enrichedHeroes]);


  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 8000);
    return () => clearInterval(id);
  }, [slides.length]);

  const heroFromSlides = slides[slide % Math.max(1, slides.length)] ?? FALLBACK_HERO;

  // O fundo agora pode vir do foco em um card (currentBackdrop) ou do slide do hero
  const HERO = currentBackdrop ? {
    title: currentTitle || "",
    year: currentYear || 0,
    image: currentBackdrop,
    release: currentGenres[0] || "",
    genres: currentGenres,
    runtime: "",
    votes: 0,
    stars: 0,
    overview: ""
  } : heroFromSlides;


  // Pré-carrega a próxima imagem para evitar "piscada" na troca de slide.
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(slide + 1) % slides.length];
    // Pré-carrega os dois próximos slides (decodificados) para a troca ser instantânea.
    const after = slides[(slide + 2) % slides.length];
    preloadImage(next?.image, "backdrop", 0);
    preloadImage(after?.image, "backdrop", 1);
  }, [slide, slides]);

  // Guarda todos os backdrops do carrossel no cache persistente (2ª abertura instantânea).
  useEffect(() => {
    if (!slides.length) return;
    const id = setTimeout(() => preloadImages(slides.map((s) => s.image), "backdrop"), 1500);
    return () => clearTimeout(id);
  }, [slides]);


  // Relógio da barra superior.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);

  const focusTile = (i: number) => {
    const next = (i + tiles.length) % tiles.length;
    setActive(next);
    const el = rowRef.current?.querySelectorAll<HTMLElement>("[data-tile]")[next];
    el?.focus();
  };

  // Foco inicial no primeiro bloco (D-pad pronto ao abrir).
  useEffect(() => {
    rowRef.current?.querySelector<HTMLElement>("[data-tile]")?.focus();
  }, []);

  /**
   * Tecla Voltar do controle na Home: em vez de sair direto, pergunta.
   * Pode ser desligado em Ajustes › Reprodução.
   */
  useEffect(() => {
    if (!settings.confirmExit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "BrowserBack" && e.key !== "Escape") return;
      // Deixa os diálogos abertos tratarem o próprio Voltar.
      if (exitOpen || pendingRemove || listsOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      setExitOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings.confirmExit, exitOpen, pendingRemove, listsOpen]);


  const openTile = (tile: Tile) => {
    if (tile.action === "lists") setListsOpen(true);
    else if (tile.to) navigate({ to: tile.to });
  };

  return (
    <main ref={pageRef} className="relative bg-vexia-bg text-vexia-text">
    <section
      className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto md:h-screen md:overflow-hidden"
      onKeyDown={(e) => {
        // O tratamento manual vale só quando o foco está na fileira de blocos.
        // Fora dela (menu superior, carrossel, cards) quem manda é a
        // navegação espacial, para o controle andar por toda a tela.
        const target = e.target as HTMLElement | null;
        if (!target?.closest?.("[data-tile]")) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusTile(active + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusTile(active - 1);
        }
      }}
    >
      {/* Fundo: apenas quando existe lista carregada. Sem lista = preto puro. */}
      {hasContent ? (
        <>
          <div key={HERO.image} className="absolute inset-0 bg-black animate-[vexia-fade-in_1200ms_ease-out]">
            <SmartImage
              src={HERO.image}
              role="backdrop"
              alt={HERO.title}
              eager
              sizes="100vw"
              className="h-full w-full object-cover opacity-60"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
        </>
      ) : (
        <div className="absolute inset-0 bg-black" />
      )}


      {/* Topo: logo + informações discretas do título em destaque (vindas da lista) */}
      <header
        className={`relative z-10 items-start gap-4 px-4 pt-5 sm:px-[5vw] sm:pt-[3vh] md:gap-[3vw] ${
          hasContent
            ? "flex flex-col items-center md:grid md:grid-cols-[auto_minmax(0,1fr)]"
            : "flex flex-col items-center justify-center"
        }`}
      >
        <h1 className="sr-only">{BRAND.name} — Início</h1>
        
        <div className="flex w-full flex-col items-center justify-center gap-6">
          <VexiaLogo
            className={
              hasContent
                ? "h-[18vh] max-h-[300px] min-h-[120px] w-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                : "h-[44vh] max-h-[840px] min-h-[220px] w-auto animate-[vexia-fade-in_700ms_ease-out] drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] md:h-[75vh] md:min-h-[420px]"
            }
          />

          {hasContent ? (
            <div
              key={`meta-${HERO.title}`}
              className="animate-[vexia-hero-in_400ms_ease-out] text-center"
            >
              <h2 className="text-[clamp(1.5rem,3.5vw,3rem)] font-black leading-tight tracking-tighter [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                {HERO.title}
              </h2>
              
              <div className="mt-2 flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest text-white/70">
                <span className="flex items-center gap-1.5 text-vexia-purple">
                  <Star className="h-4 w-4 fill-current" /> {HERO.votes.toFixed(1)}
                </span>
                <span className="text-white/30">|</span>
                <span>{HERO.year}</span>
                <span className="text-white/30">|</span>
                <span>{HERO.release}</span>
              </div>
            </div>
          ) : null}
        </div>
      </header>


      {/* Meio: imagem do carrossel em destaque (indicadores de slide) */}
      <section className="relative z-10 flex min-h-0 flex-1 items-end justify-center px-4 pb-6 sm:px-[5vw] md:pb-[3vh]">
        {slides.length > 1 ? (
          <div className="flex items-center gap-3">
            {slides.map((s, i) => (
              <button
                key={s.title + i}
                type="button"
                aria-label={`Destaque ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-[3px] overflow-hidden rounded-full outline-none transition-all duration-300 ${
                  i === slide
                    ? "w-10 bg-white/20"
                    : "w-4 bg-white/10 hover:bg-white/30 focus-visible:bg-white"
                }`}
              >
                {i === slide ? (
                  <span
                    key={`p-${slide}`}
                    className="block h-full animate-[vexia-slide-progress_8s_linear_forwards] rounded-full bg-white shadow-[0_0_12px_white]"
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : !hasContent ? (
          <p className="text-[clamp(0.6rem,0.85vw,0.85rem)] font-bold uppercase tracking-[0.2em] text-white/50">
            Carregue sua lista para começar
          </p>
        ) : null}
      </section>







      {/* Menu de blocos */}
      <nav
        ref={rowRef}
        className="relative z-10 grid shrink-0 grid-cols-3 gap-2.5 px-4 sm:grid-cols-4 sm:px-[5vw] md:gap-[1.1vw] md:[grid-template-columns:repeat(var(--vexia-tiles),minmax(0,1fr))]"
        style={{ "--vexia-tiles": tiles.length } as React.CSSProperties}
      >
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          const isActive = i === active;
          return (
            <button
              key={tile.label}
              data-tile
              type="button"
              tabIndex={0}
              onFocus={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onClick={() => openTile(tile)}
              className={`group relative flex aspect-[5/4] max-h-[20vh] w-full md:max-h-[15vh] flex-col items-center justify-center gap-[1vh] overflow-hidden rounded-2xl border outline-none backdrop-blur-md transition-all duration-200 ease-out ${
                isActive
                  ? "-translate-y-[0.6vh] scale-[1.04] border-white bg-gradient-to-b from-white/95 via-white/80 to-white/70 shadow-[0_22px_55px_-12px_rgba(255,255,255,0.45),0_0_30px_rgba(255,255,255,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "border-white/15 bg-gradient-to-b from-white/[0.09] via-white/[0.03] to-[#0a0420]/75 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(255,255,255,0.05)] hover:border-white/40 hover:from-white/[0.12] hover:via-white/[0.06] hover:to-[#0d0528]/80"
              }`}
            >
              {/* reflexo espelhado superior */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-[35%] -skew-y-1 bg-gradient-to-b from-white/35 via-white/10 to-transparent transition-opacity ${
                  isActive ? "opacity-90" : "opacity-60 group-hover:opacity-80"
                }`}
              />
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity ${
                  isActive ? "bg-white/90" : "bg-white/35"
                }`}
              />
              <Icon
                className={`relative z-10 h-[clamp(1.5rem,3.4vh,2.6rem)] w-auto shrink-0 transition-all duration-200 ${
                  isActive
                    ? "scale-110 stroke-[2.5] text-black drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                    : "stroke-[1.8] text-white/90 drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]"
                }`}
                aria-hidden
              />
              <span
                className={`relative z-10 text-[clamp(0.62rem,0.95vw,1rem)] font-black uppercase leading-none tracking-[0.2em] transition-colors ${
                  isActive
                    ? "text-black"
                    : "text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.85)]"
                }`}
              >
                {tile.label}
              </span>
              <span
                aria-hidden
                className={`pointer-events-none absolute bottom-1 h-[3px] rounded-full bg-gradient-to-r from-transparent via-white to-transparent transition-all duration-200 ${
                  isActive ? "w-3/4 opacity-100 shadow-[0_0_14px_white]" : "w-0 opacity-0"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Rodapé de ajuda */}
      <footer className="relative z-10 hidden shrink-0 flex-wrap items-center justify-center gap-x-7 md:flex gap-y-2 px-[5vw] py-[1.5vh] text-[clamp(0.65rem,0.95vw,0.95rem)] font-semibold text-white/85">
        <span className="flex items-center gap-2">
          <Move className="h-4 w-4 shrink-0 text-vexia-cyan" aria-hidden /> Navegar
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-current px-2 py-0.5 text-[0.7em] font-bold">
            ↑ ↓
          </span>
          Trocar destaque
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-current px-2 py-0.5 text-[0.7em] font-bold">
            OK
          </span>
          Selecionar
        </span>
        <Link
          to="/configuracoes"
          className="flex items-center gap-2 outline-none focus-visible:text-vexia-cyan"
        >
          <Menu className="h-4 w-4 shrink-0" aria-hidden /> Menu
        </Link>
      </footer>

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />

      <ConfirmDialog
        open={exitOpen}
        title={`Sair do ${BRAND.name}?`}
        message="Você voltará para a tela inicial do aparelho."
        confirmLabel="SAIR"
        onConfirm={() => {
          setExitOpen(false);
          // Em TV/TV Box o app roda em WebView: fechar a janela encerra a sessão.
          window.close();
        }}
        onCancel={() => setExitOpen(false)}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remover de Continuar assistindo?"
        message={
          pendingRemove
            ? `"${pendingRemove.name}" sairá da lista e o progresso salvo será apagado.`
            : undefined
        }
        onConfirm={() => {
          const entry = pendingRemove;
          if (!entry) return;
          removeWatch(entry.key);
          clearProgress(entry.liveId ?? entry.id);
          if (entry.episodeId) clearProgress(`${entry.liveId ?? entry.id}::${entry.episodeId}`);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </section>

      {/* Carrosséis premium de descoberta (M3U + TMDB) */}
      <DiscoverRows />
    </main>
  );
}
