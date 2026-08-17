import { setStreamHandoff } from "../lib/stream-handoff";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, Heart, Lock, Play, Search, Tv, Clock } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { PlaylistErrorState } from "../components/vexia/PlaylistErrorState";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { PinPrompt } from "../components/vexia/PinPrompt";
import { isAdultText, useParentalUnlocked } from "../lib/parental";
import { useSettings } from "../lib/settings-store";
import { usePlaylist } from "../lib/playlist-store";
import type { PlaylistChannel } from "../lib/m3u";
import { channelFavorite, useFavorites } from "../lib/favorites-store";
import { matchesChannel, sortChannels, useFilters, useSort } from "../lib/filters-store";
import { SortControl } from "../components/vexia/SortControl";
import { useDebounce } from "../hooks/useDebounce";
import { buildSearchIndex, queryIndex } from "../utils/search-index";
import { VirtualizedList } from "../components/VirtualizedGrid";
import { SmartImage } from "../components/vexia/SmartImage";
import ChannelPreview from "../components/vexia/ChannelPreview";
import { useEpg, useMinuteTick, nowAndNext } from "../hooks/use-epg";

import { readLastChannel, writeLastChannel } from "../lib/last-channel";
import {
  cancelChannelPrefetch,
  prefetchChannel,
  prefetchChannelNow,
  prefetchNeighbors,
} from "../lib/stream-prefetch";

import { fetchShortEpg, liveStreamId, type EpgEntry } from "../lib/xtream-extras";
import { CatchupDialog } from "../components/vexia/CatchupDialog";
import { GroupsDialog } from "../components/vexia/GroupsDialog";
import { ChannelPinPrompt } from "../components/vexia/ChannelPinPrompt";
import { useGroups } from "../lib/groups-store";
import { toggleChannelLock, useChannelLocks } from "../lib/channel-lock";
import { BRAND } from "../lib/brand";
import { MarqueeText } from "../components/vexia/MarqueeText";


/** Hora no formato 20:30. */
function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * EPG curta direto do painel (`get_short_epg`) — usada só quando o XMLTV não
 * tem dados do canal focado. É o caminho leve do APK base: uma requisição
 * pequena por canal, com cache de 5 min.
 */
function useShortEpg(channel: PlaylistChannel | null, enabled: boolean) {
  const { source } = usePlaylist();
  const url = source?.url ?? "";
  const streamId = liveStreamId(channel?.url);
  const [data, setData] = useState<{ now?: EpgEntry; next?: EpgEntry }>({});

  useEffect(() => {
    if (!enabled || !url || !streamId) {
      setData({});
      return;
    }
    const ctrl = new AbortController();
    // Espera o zapping parar antes de consultar o painel.
    const timer = setTimeout(() => {
      fetchShortEpg(url, streamId, ctrl.signal)
        .then((list) => {
          const now = Date.now();
          setData({
            now: list.find((e) => e.start <= now && e.stop > now),
            next: list.find((e) => e.start > now),
          });
        })
        .catch(() => setData({}));
    }, 320);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [enabled, url, streamId]);

  return data;
}




export const Route = createFileRoute("/canais")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Canais ao vivo` },
      {
        name: "description",
        content:
          "Canais ao vivo da sua lista M3U/HLS com categorias automáticas, prévia e favoritos.",
      },
      { property: "og:title", content: `${BRAND.name} — Canais` },
      { property: "og:description", content: "Canais ao vivo organizados por categoria." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/canais" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/canais" }],
  }),
  component: ChannelsPage,
});

const PAGE = 50;

/** Extrai a qualidade anunciada no nome do canal (FHD, HD, SD, 4K, 1080p...). */
function qualityOf(name: string) {
  const m = name.match(/\b(4K|UHD|FHD|HD|SD|H265|1080p|720p|480p)\b/i);
  return m ? m[1].toUpperCase() : "";
}

/**
 * Linha da lista de canais — memoizada.
 *
 * O APK base refazia a lista inteira (notifyDataSetChanged) a cada troca de
 * seleção, o que reacende todos os logos. Aqui cada linha só re-renderiza
 * quando o que ELA mostra muda: nome, logo, favorito, foco ou programa no ar.
 */
const ChannelRow = memo(function ChannelRow({
  ch,
  index,
  isActive,
  isFav,
  isLocked,
  nowTitle,
  onSelect,
  onToggleFav,
  onDoubleClick,
}: {
  ch: PlaylistChannel;
  index: number;
  isActive: boolean;
  isFav: boolean;
  isLocked: boolean;
  nowTitle: string;
  onSelect: (ch: PlaylistChannel) => void;
  onToggleFav: (ch: PlaylistChannel) => void;
  onDoubleClick: (ch: PlaylistChannel) => void;
}) {
  const quality = qualityOf(ch.name);
  return (
    <div className="group relative mb-1.5">
      <button
        type="button"
        data-nav-row={2}
        tabIndex={0}
        onClick={() => onSelect(ch)}
        onMouseEnter={() => onSelect(ch)}
        onDoubleClick={() => onDoubleClick(ch)}
        className={`vexia-focus flex w-full items-center gap-3 rounded-xl border py-2.5 pl-3 pr-11 text-left transition-all duration-200 focus:border-vexia-purple focus:shadow-[0_0_25px_rgba(123,43,190,0.8)] ${
          isActive
            ? "scale-[1.02] border-vexia-purple bg-vexia-purple shadow-[0_0_25px_rgba(123,43,190,0.8),inset_0_0_15px_rgba(123,43,190,0.4)]"
            : "border-white/[0.06] bg-black/45 hover:border-vexia-purple/40 hover:bg-vexia-purple/15"
        }`}
      >
        <span
          className={`w-7 shrink-0 text-right text-xs font-bold ${isActive ? "text-white" : "text-vexia-muted"}`}
        >
          {index + 1}
        </span>
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/70">
          {ch.logo ? (
            <SmartImage
              src={ch.logo}
              role="logo"
              alt=""
              className="h-full w-full object-contain p-0.5"
              fallback={<Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />}
            />
          ) : (
            <Tv className="h-4 w-4 text-vexia-cyan" aria-hidden />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {isLocked ? (
              <Lock className="h-3 w-3 shrink-0 text-vexia-cyan" aria-label="Canal bloqueado" />
            ) : null}
            <MarqueeText text={ch.name} className="block text-sm font-semibold text-vexia-text" />
          </span>
          <span
            className={`block truncate text-[11px] font-medium ${isActive ? "text-white/80" : "text-vexia-cyan/80"}`}
          >
            {nowTitle || ch.group}
            {quality ? ` • ${quality}` : ""}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onToggleFav(ch)}
        aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={`absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border transition-all ${
          isFav
            ? "border-vexia-purple/60 bg-vexia-purple shadow-[0_0_14px_rgb(var(--vexia-primary-rgb)/0.7)]"
            : "border-vexia-cyan/40 bg-black/50 hover:border-vexia-cyan"
        }`}
      >
        <Heart
          className={`h-3.5 w-3.5 ${isFav ? "fill-current text-vexia-text" : "text-vexia-cyan"}`}
          aria-hidden
        />
      </button>
    </div>
  );
});

function ChannelsPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);

  const navigate = useNavigate();
  const { channels: allChannels, data, hasContent } = usePlaylist();
  /* Ajustes → Controle dos Pais / Ocultar Categorias. */
  const { settings } = useSettings();
  const unlockedAdult = useParentalUnlocked();
  const [pinOpen, setPinOpen] = useState(false);
  const blockAdult = settings.parentalEnabled && !unlockedAdult;
  /** Canal é adulto quando nome, categoria ou grupo indicam conteúdo +18. */
  const isAdultChannel = useCallback(
    (c: PlaylistChannel) => isAdultText(c.name, c.category, c.group),
    [],
  );
  /**
   * Conteúdo adulto NUNCA vem na frente:
   * - com Controle dos Pais ligado (e sem PIN) ele é removido da lista;
   * - sem o controle, ele continua visível mas sempre no FIM da lista, então o
   *   app nunca abre num canal adulto ao carregar a lista.
   */
  const channels = useMemo(() => {
    if (blockAdult) return allChannels.filter((c) => !isAdultChannel(c));
    const safe: PlaylistChannel[] = [];
    const adult: PlaylistChannel[] = [];
    for (const c of allChannels) (isAdultChannel(c) ? adult : safe).push(c);
    return adult.length ? [...safe, ...adult] : allChannels;
  }, [allChannels, blockAdult, isAdultChannel]);
  const hasAdultChannels = useMemo(
    () => allChannels.some((c) => isAdultChannel(c)),
    [allChannels, isAdultChannel],
  );
  /** Enquanto o PIN não é digitado, todo canal adulto fica fechado. */
  const adultBlocked = useCallback(
    (c: PlaylistChannel | null | undefined) =>
      Boolean(c) && !unlockedAdult && isAdultChannel(c as PlaylistChannel),
    [unlockedAdult, isAdultChannel],
  );
  const hasBlockedChannels = hasAdultChannels && !unlockedAdult;

  const { has, toggle } = useFavorites();

  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PlaylistChannel | null>(null);
  const { guide } = useEpg();
  const minuteTick = useMinuteTick();
  const xmltvEpg = nowAndNext(guide, selected?.tvgId, minuteTick);
  /**
   * Fallback do APK base: quando o XMLTV não cobre o canal, o painel responde
   * `get_short_epg` só do canal focado — resposta minúscula e instantânea.
   */
  const shortEpg = useShortEpg(selected, !xmltvEpg.now);
  const selectedEpg = xmltvEpg.now ? xmltvEpg : shortEpg;
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);
  const [catchupOpen, setCatchupOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

  /* Grupos personalizados ("Meus grupos") e cadeado por canal. */
  const { groups } = useGroups();
  const locks = useChannelLocks();
  /** Canal esperando PIN antes de abrir. */
  const [pendingLocked, setPendingLocked] = useState<PlaylistChannel | null>(null);

  /** Estado salvo do último canal (id + se estava em tela cheia). */
  const [lastChannel] = useState(() => readLastChannel());
  const restoredRef = useRef(false);
  /** Evita disparar duas navegações se o clique repetir muito rápido. */
  const openingRef = useRef(false);

  /** Abre o canal em tela cheia, reaproveitando o stream já aquecido na prévia. */
  const openFullscreen = useCallback(
    (ch: PlaylistChannel) => {
      if (openingRef.current) return;
      // Canal adulto: só toca depois do PIN do Controle dos pais.
      if (adultBlocked(ch)) {
        setPinOpen(true);
        return;
      }
      // Canal trancado só abre depois do PIN.
      if (locks.blocked(ch.id)) {
        setPendingLocked(ch);
        return;
      }
      openingRef.current = true;
      writeLastChannel(ch.id, true);
      setStreamHandoff("live", ch.id, ch.url);
      void navigate({ to: "/player", search: { type: "live", id: ch.id } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, locks.blocked, adultBlocked],
  );


  /** 1º clique: seleciona e roda a prévia. 2º clique no mesmo canal: tela cheia. */
  const onChannelClick = useCallback(
    (ch: PlaylistChannel) => {
      if (selected?.id === ch.id) {
        openFullscreen(ch);
        return;
      }
      setSelected(ch);
      writeLastChannel(ch.id, false);
    },
    [selected, openFullscreen],
  );

  /** Clique duplo em qualquer canal abre tela cheia imediatamente. */
  const onChannelDoubleClick = useCallback(
    (ch: PlaylistChannel) => {
      openFullscreen(ch);
    },
    [openFullscreen],
  );


  const favs = useMemo(
    () => channels.filter((c) => has("channel", c.name)).map((c) => c.id),
    [channels, has],
  );

  const toggleFav = useCallback(
    (ch: PlaylistChannel) => toggle(channelFavorite(ch)),
    [toggle],
  );

  // Categorias 100% dinâmicas: vêm sempre do group-title da lista carregada.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of channels) map.set(ch.category, (map.get(ch.category) ?? 0) + 1);
    return map;
  }, [channels]);

  const rawCategories = data?.channelCategories ?? ["Todos"];
  /** Categorias adultas somem (com PIN ativo) ou vão para o fim da barra. */
  const categories = useMemo(() => {
    if (blockAdult) return rawCategories.filter((cat) => !isAdultText(cat));
    const safe = rawCategories.filter((cat) => !isAdultText(cat));
    const adult = rawCategories.filter((cat) => isAdultText(cat));
    return adult.length ? [...safe, ...adult] : rawCategories;
  }, [rawCategories, blockAdult]);

  const { filters } = useFilters();
  const { sort } = useSort();

  const index = useMemo(
    () =>
      buildSearchIndex(channels, {
        id: (c) => c.id,
        name: (c) => c.name,
        category: (c) => c.category,
        genre: (c) => c.group,
      }),
    [channels],
  );
  const debouncedQuery = useDebounce(query, 250);

  const list = useMemo(() => {
    const searched = debouncedQuery.trim() ? queryIndex(index, debouncedQuery) : channels;
    // Categorias do tipo "grp:<id>" são grupos criados pelo próprio usuário.
    const group = category.startsWith("grp:")
      ? groups.find((g) => g.id === category.slice(4))
      : undefined;
    const base = searched.filter(
      (c) =>
        (category === "Todos" ||
          (group
            ? group.items.includes(c.id)
            : category === "Favoritos"
              ? favs.includes(c.id)
              : c.category === category)) &&
        matchesChannel(c.name, c.category, filters),
    );
    const sorted = sortChannels(base, sort);

    // A ordenação escolhida pelo cliente (A–Z, recentes etc.) acontece depois
    // da lista principal e poderia trazer os canais +18 novamente para o topo.
    // Faça a partição como ÚLTIMA etapa para manter a ordem interna escolhida,
    // mas garantir que todo conteúdo adulto fique sempre no fim de "Todos".
    if (category !== "Todos") return sorted;
    const safe: PlaylistChannel[] = [];
    const adult: PlaylistChannel[] = [];
    for (const channel of sorted) {
      (isAdultChannel(channel) ? adult : safe).push(channel);
    }
    return adult.length ? [...safe, ...adult] : sorted;
  }, [channels, index, debouncedQuery, category, favs, filters, sort, groups, isAdultChannel]);


  useEffect(() => {
    setSelected((cur) => {
      if (cur && list.some((c) => c.id === cur.id)) return cur;
      // Ao voltar para a página, retoma o último canal usado, se ainda existir.
      if (!restoredRef.current && lastChannel) {
        const saved = list.find((c) => c.id === lastChannel.id);
        if (saved) {
          restoredRef.current = true;
          return saved;
        }
      }
      return list[0] ?? null;
    });
  }, [list, lastChannel]);


  /* Callback estável: a prévia memoizada não re-renderiza a cada tique do EPG. */
  const selectedRef = useRef<PlaylistChannel | null>(null);
  selectedRef.current = selected;
  const openSelectedFullscreen = useCallback(() => {
    const cur = selectedRef.current;
    if (cur) openFullscreen(cur);
  }, [openFullscreen]);

  /**
   * Zapping: a prévia só sobe quando o cliente PARA no canal (180 ms).
   * Assim, passar rápido pela lista com o controle não abre e fecha um stream
   * por linha — a navegação fica lisa e a banda vai toda para o canal escolhido.
   */
  const previewChannel = useDebounce(selected, 50);

  /**
   * Aquecimento imediato do canal focado: DNS/TLS + biblioteca do motor já
   * resolvidos durante os 50 ms de debounce, então quando a prévia monta o
   * stream começa praticamente na hora (sem custo de banda de vídeo).
   */
  useEffect(() => {
    if (selected?.url) prefetchChannelNow(selected.url);
  }, [selected?.url]);

  /**
   * Prefetch dos vizinhos guiado pelo histórico de navegação: guardamos o
   * índice anterior para saber se o cliente está descendo ou subindo a lista e
   * preparamos (manifesto + primeiro segmento) os 2 canais desse lado. Assim o
   * próximo ↓/↑ abre a prévia na hora. Parado no lugar: prepara os dois lados.
   */
  const lastIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selected) return;
    const idx = list.findIndex((c) => c.id === selected.id);
    if (idx < 0) return;
    const prevIdx = lastIdxRef.current;
    lastIdxRef.current = idx;
    const dir = prevIdx === null || prevIdx === idx ? 0 : idx > prevIdx ? 1 : -1;
    const at = (i: number) => list[i]?.url;
    const targets =
      dir === 1
        ? [at(idx + 1), at(idx + 2)]
        : dir === -1
          ? [at(idx - 1), at(idx - 2)]
          : [at(idx + 1), at(idx - 1)];
    prefetchNeighbors(targets);
    // Mantém o prefetch leve de manifesto do canal seguinte (baixo custo).
    prefetchChannel(at(idx + 1));
    return () => cancelChannelPrefetch();
  }, [selected, list]);


  const shell = (children: React.ReactNode) => (
    <main
      ref={scopeRef}
      className="vexia-safe relative flex h-screen max-h-screen flex-col overflow-hidden bg-vexia-bg text-vexia-text"
      style={{
        height: "100dvh",
        backgroundImage: `linear-gradient(rgba(9,2,26,0.52), rgba(4,0,14,0.68)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 md:px-8">
        <TopNav active="Canais" />
        <label className="relative order-last w-full min-w-0 flex-1 sm:order-none sm:w-auto sm:max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            data-nav-row={0}
            tabIndex={0}
            placeholder="Buscar canal, categoria ou grupo"
            aria-label="Buscar canais"
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2.5 pl-11 pr-4 text-sm text-vexia-text outline-none backdrop-blur-xl placeholder:text-vexia-text/45"
          />
        </label>
        <SortControl navRow={0} labels={{ nota: "Ordem da lista", recentes: "Mais recentes" }} />

        <div className="ml-auto hidden md:block">
          <VexiaLogo className="h-10 md:h-14" />
        </div>
      </header>

      {children}
      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
  );

  if (!hasContent || channels.length === 0) {
    return shell(
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 md:px-8">
        <PlaylistErrorState />
        <EmptyPlaylist section="Os canais ao vivo" onOpenLists={() => setListsOpen(true)} />
      </div>,
    );
  }

  const visible = list.slice(0, limit);
  /* Listas grandes: apenas as linhas visíveis são montadas. */
  const useVirtual = list.length > 120;

  const renderChannel = (ch: PlaylistChannel, i: number) => (
    <ChannelRow
      ch={ch}
      index={i}
      isActive={selected?.id === ch.id}
      isFav={favs.includes(ch.id)}
      isLocked={locks.locked(ch.id) || adultBlocked(ch)}
      nowTitle={nowAndNext(guide, ch.tvgId, minuteTick).now?.title ?? ""}
      onSelect={onChannelClick}
      onToggleFav={toggleFav}
      onDoubleClick={onChannelDoubleClick}
    />
  );



  return shell(
    <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-3 pb-3 md:overflow-hidden md:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.1fr)] md:px-6">
      {/* Coluna 1 — categorias dinâmicas */}
      <aside className="vexia-scroll order-2 max-h-[26vh] min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden scroll-p-6 pr-1 [contain:layout_paint] md:order-none md:max-h-none">
        <h1 className="px-3 py-2 text-sm font-black tracking-[0.2em] text-vexia-text">CANAIS</h1>
        {hasBlockedChannels ? (
          <button
            type="button"
            onClick={() => setPinOpen(true)}
            className="vexia-focus w-full rounded-xl border border-vexia-purple/40 bg-black/40 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-vexia-cyan"
          >
            Liberar conteúdo adulto
          </button>
        ) : null}
        <PinPrompt open={pinOpen} onClose={() => setPinOpen(false)} />
        {(settings.hideCategories ? ["Favoritos", "Todos"] : ["Favoritos", ...categories]).map((cat) => {
          const total = cat === "Todos" ? channels.length : cat === "Favoritos" ? favs.length : (counts.get(cat) ?? 0);
          const isActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              data-nav-row={1}
              tabIndex={0}
              onClick={() => {
                setCategory(cat);
                setLimit(PAGE);
              }}
              className={`vexia-focus group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                isActive
                  ? "border-vexia-purple/60 bg-vexia-purple text-white shadow-[0_0_20px_-4px_rgb(var(--vexia-primary-rgb)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)]"
                  : "border-white/[0.07] bg-black/45 text-vexia-text hover:border-vexia-purple/40 hover:bg-vexia-purple/20"
              }`}
            >
              <Tv className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <MarqueeText text={cat.toUpperCase()} />
              <span className={`text-[11px] ${isActive ? "text-white/80" : "text-vexia-muted"}`}>
                {total}
              </span>
            </button>
          );
        })}

        {/* Meus grupos: categorias montadas pelo usuário */}
        {groups.length ? (
          <>
            <p className="px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.2em] text-vexia-muted">
              Meus grupos
            </p>
            {groups.map((g) => {
              const key = `grp:${g.id}`;
              const isActive = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onClick={() => {
                    setCategory(key);
                    setLimit(PAGE);
                  }}
                  className={`vexia-focus group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                    isActive
                      ? "border-vexia-purple/60 bg-vexia-purple text-white shadow-[0_0_20px_-4px_rgb(var(--vexia-primary-rgb)/0.9),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "border-white/[0.07] bg-black/45 text-vexia-text hover:border-vexia-purple/40 hover:bg-vexia-purple/20"
                  }`}
                >
                  <FolderPlus className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <MarqueeText text={g.name.toUpperCase()} />
                  <span
                    className={`text-[11px] ${isActive ? "text-white/80" : "text-vexia-muted"}`}
                  >
                    {g.items.length}
                  </span>
                </button>
              );
            })}
          </>
        ) : null}

        <button
          type="button"
          data-nav-row={1}
          tabIndex={0}
          onClick={() => setGroupsOpen(true)}
          className="vexia-focus mt-2 flex w-full items-center gap-2.5 rounded-xl border border-vexia-cyan/30 bg-black/40 px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-vexia-cyan"
        >
          <FolderPlus className="h-4 w-4 shrink-0" aria-hidden /> Gerenciar grupos
        </button>
      </aside>


      {/* Coluna 2 — lista de canais */}
      <section
        className={`order-3 h-[60vh] min-h-0 border-white/5 px-0 md:order-none md:h-auto md:border-x md:px-2 ${useVirtual ? "" : "no-scrollbar overflow-y-auto"}`}
      >
        <h2 className="sr-only">Lista de canais</h2>
        {useVirtual ? (
          <VirtualizedList
            items={list}
            height="100%"
            className="no-scrollbar"
            keyFor={(ch) => ch.id}
            renderItem={(ch, i) => renderChannel(ch, i)}
          />

        ) : (
          <>
            {visible.map((ch, i) => (
              <div key={ch.id}>{renderChannel(ch, i)}</div>
            ))}

            {limit < list.length ? (
              <button
                type="button"
                data-nav-row={3}
                tabIndex={0}
                onClick={() => setLimit((l) => l + PAGE)}
                className="vexia-focus mt-2 w-full rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_26px_-12px_rgb(var(--vexia-primary-rgb)/0.9)]"
              >
                Carregar mais canais
              </button>
            ) : null}
          </>
        )}

        {list.length === 0 ? (
          <p className="px-3 py-6 text-sm text-vexia-muted">Nenhum canal encontrado.</p>
        ) : null}
      </section>


      {/* Coluna 3 — prévia do canal */}
      <section className="no-scrollbar order-1 min-h-0 space-y-3 overflow-y-auto md:order-none">
        <h2 className="sr-only">Prévia do canal selecionado</h2>
        {lastChannel?.fullscreen && selected?.id === lastChannel.id ? (
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => selected && openFullscreen(selected)}
            className="vexia-focus flex w-full items-center justify-between gap-3 rounded-xl border border-vexia-cyan/40 bg-black/60 px-4 py-2.5 text-left backdrop-blur-xl"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-vexia-text">
              Você estava assistindo em tela cheia
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-vexia-cyan">
              Retomar
            </span>
          </button>
        ) : null}

        <ChannelPreview
          src={
            previewChannel &&
            (adultBlocked(previewChannel) || locks.blocked(previewChannel.id))
              ? null
              : previewChannel?.url ?? null
          }
          name={previewChannel?.name ?? selected?.name ?? "Canal"}
          logo={previewChannel?.logo ?? selected?.logo}
          onOpenFullscreen={openSelectedFullscreen}
        />




        <div>
          <h2 className="text-xl font-black text-vexia-text">{selected?.name ?? "—"}</h2>
          <p className="mt-1 text-sm font-medium text-vexia-cyan">
            {[qualityOf(selected?.name ?? "") || "SD", "Ao vivo", selected?.category]
              .filter(Boolean)
              .join(" • ")}
          </p>
          {selectedEpg.now ? (
            <div className="mt-3 rounded-xl border border-vexia-purple/40 bg-black/50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-vexia-cyan">
                No ar agora
              </p>
              <p className="mt-1 text-sm font-bold text-vexia-text">{selectedEpg.now.title}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan"
                  style={{
                    width: `${Math.round(
                      Math.min(
                        1,
                        Math.max(
                          0,
                          (minuteTick - selectedEpg.now.start) /
                            Math.max(1, selectedEpg.now.stop - selectedEpg.now.start),
                        ),
                      ) * 100,
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-vexia-muted">
                {formatClock(selectedEpg.now.start)} – {formatClock(selectedEpg.now.stop)}
                {selectedEpg.next ? ` • A seguir: ${selectedEpg.next.title}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => selected && openFullscreen(selected)}

            className="vexia-focus inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-6 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_26px_-12px_rgb(var(--vexia-primary-rgb)/0.9)]"
          >
            <Play className="h-4 w-4" aria-hidden /> Assistir
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => selected && toggleFav(selected)}
            className="vexia-focus rounded-xl border border-vexia-cyan/40 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            {selected && favs.includes(selected.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => document.querySelector<HTMLInputElement>('input[aria-label="Buscar canais"]')?.focus()}
            className="vexia-focus rounded-xl border border-white/10 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            Procurar
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => setCatchupOpen(true)}
            className="vexia-focus rounded-xl border border-vexia-purple/50 bg-vexia-card px-6 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-vexia-cyan"
          >
            Replay
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => setGroupsOpen(true)}
            className="vexia-focus inline-flex items-center gap-2 rounded-xl border border-vexia-cyan/40 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            <FolderPlus className="h-4 w-4" aria-hidden /> Grupos
          </button>
          <button
            type="button"
            data-nav-row={4}
            tabIndex={0}
            onClick={() => selected && toggleChannelLock(selected.id)}
            className="vexia-focus inline-flex items-center gap-2 rounded-xl border border-vexia-purple/50 bg-vexia-card px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-vexia-text"
          >
            <Lock className="h-4 w-4" aria-hidden />
            {selected && locks.locked(selected.id) ? "Destrancar canal" : "Trancar canal"}
          </button>
        </div>
      </section>

      <CatchupDialog open={catchupOpen} channel={selected} onClose={() => setCatchupOpen(false)} />
      <GroupsDialog
        open={groupsOpen}
        onClose={() => setGroupsOpen(false)}
        channelId={selected?.id}
        channelName={selected?.name}
      />
      <ChannelPinPrompt
        open={Boolean(pendingLocked)}
        channelId={pendingLocked?.id}
        channelName={pendingLocked?.name}
        onClose={() => setPendingLocked(null)}
        onUnlocked={() => {
          const ch = pendingLocked;
          setPendingLocked(null);
          if (ch) openFullscreen(ch);
        }}
      />
    </div>,


  );
}
