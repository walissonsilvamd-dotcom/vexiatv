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


  // Pool de destaques: 30 títulos aleatórios entre os mais bem avaliados (>= 2025)
  // Filtra conteúdo adulto e prioriza lançamentos de alta qualidade
  const heroPool = useMemo<MediaItem[]>(() => {
    const all = [...movies, ...series]
      .filter((m) => m.poster) // Apenas com capa certinha
      .filter((m) => !isAdultText(m.title, m.category, ...(m.genres || [])))
      .filter((m) => (m.year || 0) >= 2025)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 60); // Pega os 60 melhores para ter margem de escolha

    // Embaralha para pegar 30 aleatórios
    return [...all].sort(() => Math.random() - 0.5).slice(0, 30);
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
    <main ref={pageRef} className="relative h-screen w-full overflow-hidden bg-vexia-bg text-vexia-text">
      {/* Layout Principal: Sidebar + Conteúdo */}
      <div className="relative flex h-full w-full">
        
        {/* Sidebar Esquerda */}
        <aside className="relative z-30 flex w-[22vw] max-w-[280px] flex-col items-center bg-black/30 px-5 pt-0 pb-6 backdrop-blur-2xl border-r border-white/10">
          <VexiaLogo
            className={
              hasContent
                ? "mb-6 h-auto w-[85%] drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                : "h-[44vh] max-h-[840px] min-h-[220px] w-auto animate-[vexia-fade-in_700ms_ease-out] drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] md:h-[75vh] md:min-h-[420px]"
            }
          />

          {/* Menu Vertical */}
          <nav
            ref={rowRef}
            className="flex w-full flex-col gap-2.5"
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
                  className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border px-4 py-3.5 outline-none transition-all duration-300 ease-out ${
                    isActive
                      ? "scale-[1.02] border-white/40 bg-white/20 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-md"
                      : "border-transparent bg-white/5 text-white/50 hover:bg-white/10 hover:text-white backdrop-blur-sm"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                      isActive ? "scale-110 text-white" : "text-white/40 group-hover:text-white"
                    }`}
                  />
                  <span className={`text-[0.8rem] font-black uppercase tracking-[0.12em] transition-colors duration-300 ${
                    isActive ? "text-white" : "text-white/40 group-hover:text-white"
                  }`}>
                    {tile.label}
                  </span>
                  {isActive && (
                    <div className="absolute left-0 h-8 w-1.5 rounded-r-full bg-vexia-purple shadow-[0_0_15px_#7B2BBE]" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Área de Conteúdo (Hero e Destaques) */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Fundo Imersivo */}
          {hasContent ? (
            <>
              <div key={HERO.image} className="absolute inset-0 bg-black animate-[vexia-fade-in_1200ms_ease-out]">
                <SmartImage
                  src={HERO.image}
                  role="backdrop"
                  alt={HERO.title}
                  eager
                  sizes="80vw"
                  className="h-full w-full object-cover opacity-60"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
            </>
          ) : (
            <div className="absolute inset-0 bg-black" />
          )}

          {/* Header com Metadados (Canto Superior Direito) */}
          {hasContent && (
            <header className="relative z-10 flex w-full justify-end p-8 pt-10 sm:px-[5vw]">
              <div
                key={`meta-${HERO.title}`}
                className="animate-[vexia-hero-in_400ms_ease-out] text-right"
              >
                <h2 className="text-[clamp(1.5rem,3.2vw,2.8rem)] font-black leading-tight tracking-tighter [text-shadow:0_4px_20px_rgba(0,0,0,0.9)]">
                  {HERO.title}
                </h2>
                
                <div className="mt-2 flex items-center justify-end gap-4 text-xs font-black uppercase tracking-widest text-white/70">
                  <span className="flex items-center gap-1.5 text-yellow-400">
                    <Star className="h-3.5 w-3.5 fill-current" /> {HERO.votes.toFixed(1)}
                  </span>
                  <span className="text-white/30">|</span>
                  <span className="text-vexia-purple">{HERO.runtime === "FILME" ? "FILME" : "SÉRIE"}</span>
                  <span className="text-white/30">|</span>
                  <span>{HERO.year}</span>
                  <span className="text-white/30">|</span>
                  <span>{HERO.release}</span>
                </div>
              </div>
            </header>
          )}

          {/* Área Central Vazia para respirar a arte */}
          <div className="flex-1" />

          {/* Indicadores de Slide */}
          <section className="relative z-10 flex items-center justify-center p-8">
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
        </div>
      </div>


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
          clearLastSession();
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

      <div className="relative z-10">
        <DiscoverRows />
      </div>
    </main>
  );
}



