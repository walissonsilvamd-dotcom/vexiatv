import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Play, Tv, Wifi, Settings } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { SmartImage } from "../components/vexia/SmartImage";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { useEpg, useMinuteTick, nowAndNext } from "../hooks/use-epg";
import { usePlaylist } from "../lib/playlist-store";
import { setStreamHandoff } from "../lib/stream-handoff";
import type { PlaylistChannel } from "../lib/m3u";
import { BRAND } from "../lib/brand";
import { FootballLiveScore } from "../components/vexia/FootballLiveScore";
import { Skeleton } from "../components/ui/skeleton";
import { extractFootballScore, FootballScore } from "../lib/football-score";
import { getLiveFootballScores, EspnGame } from "../lib/espn.functions";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: `Jogos ao vivo — ${BRAND.name}` },
      {
        name: "description",
        content:
          `Agenda esportiva do ${BRAND.name}: canais de esporte da sua lista com o que está no ar agora e o que vem a seguir.`,
      },
      { property: "og:title", content: `Jogos ao vivo — ${BRAND.name}` },
      {
        property: "og:description",
        content: "Veja os jogos no ar agora nos canais de esporte da sua lista.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/jogos" },
      { property: "og:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `https://vexiatv.lovable.app${ogImage.url}` },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/jogos" }],
  }),
  component: JogosPage,
});

/** Palavras que identificam canais/eventos esportivos nas listas IPTV. */
const SPORT_HINTS = [
  "premiere",
  "futebol",
  "fut ",
  "soccer",
  "libertadores",
  "champions",
  "brasileir",
  "goltv",
  "espn",
  "tnt sports",
  "sportv",
  "dazn",
];

function isSport(...parts: (string | undefined)[]) {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  return SPORT_HINTS.some((hint) => text.includes(hint));
}

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function JogosPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const navigate = useNavigate();
  const { channels, hasContent } = usePlaylist();
  const { guide } = useEpg();
  const minuteTick = useMinuteTick();
  const [listsOpen, setListsOpen] = useState(false);
  const [espnEvents, setEspnEvents] = useState<EspnGame[]>([]);
  const [loadingEspn, setLoadingEspn] = useState(false);

  // Busca dados da ESPN a cada 60 segundos se estiver na tela
  useEffect(() => {
    const fetchEspn = async () => {
      setLoadingEspn(true);
      try {
        const data = await getLiveFootballScores();
        setEspnEvents(data.events || []);
      } catch (e) {
        console.error("ESPN load failed", e);
      } finally {
        setLoadingEspn(false);
      }
    };

    fetchEspn();
    const timer = setInterval(fetchEspn, 60000);
    return () => clearInterval(timer);
  }, []);

  /** Canais de esporte da lista, com programa atual e próximo. */
  const games = useMemo(() => {
    const sports = channels.filter((c) => {
      const name = c.name.toLowerCase();
      const cat = c.category.toLowerCase();
      const grp = (c.group || "").toLowerCase();
      
      // Bloqueio de reprise / replay
      const isReplay = name.includes("reprise") || name.includes("replay") || name.includes("gravado");
      if (isReplay) return false;

      // Apenas futebol
      const isFootball = name.includes("futebol") || name.includes("soccer") || name.includes("brasileir") || 
                        name.includes("libertadores") || name.includes("champions") || name.includes("copa") ||
                        cat.includes("futebol") || cat.includes("soccer") || grp.includes("futebol") || grp.includes("soccer") ||
                        grp.includes("brasileir") || cat.includes("brasileir");
      
      // Canais de esporte que costumam passar futebol
      const isSportChannel = name.includes("premiere") || name.includes("espn") || name.includes("tnt") || name.includes("dazn") ||
                            name.includes("sportv") || cat.includes("sport") || grp.includes("esporte");
      
      // Bloqueio explícito de outros esportes
      const isOtherSport = name.includes("futsal") || name.includes("nba") || name.includes("nfl") || name.includes("nhl") || 
                          name.includes("golfe") || name.includes("surfe") || name.includes("tennis") || name.includes("ufc") || 
                          name.includes("lutas") || name.includes("basquete") ||
                          cat.includes("nba") || cat.includes("nfl");

      return (isFootball || isSportChannel) && !isOtherSport;
    });
    
    // Converte eventos ESPN para nosso formato de placar
    const espnScores = espnEvents.map(event => {
      const home = event.competitors.find(c => c.homeAway === "home");
      const away = event.competitors.find(c => c.homeAway === "away");
      const isFinished = event.status.type.state === "post";
      
      // Tenta extrair o nome da liga do nome do evento ou metadados
      const leagueName = event.name.split(" vs ")[0] === home?.team.displayName ? "" : ""; // ESPN API usually doesn't have league in top level here but we can infer or leave empty for now
      
      return {
        id: event.id,
        teamA: home?.team.displayName || "",
        teamB: away?.team.displayName || "",
        scoreA: parseInt(home?.score || "0"),
        scoreB: parseInt(away?.score || "0"),
        logoA: home?.team.logo,
        logoB: away?.team.logo,
        time: event.status.type.state === "in" ? event.status.displayClock : event.status.type.description,
        isLive: event.status.type.state === "in",
        isFinished,
        broadcastChannels: event.broadcasts?.[0]?.names || [],
        league: event.shortName // Aprox de liga na ESPN
      } as FootballScore & { isFinished: boolean };
    });

    // Agrupa canais por evento (jogo)
    const gamesByEvent: Record<string, { score: FootballScore; chs: { ch: PlaylistChannel; epg: any }[] }> = {};
    const standaloneChannels: { ch: PlaylistChannel; epg: any; score?: FootballScore }[] = [];

    sports.forEach((ch) => {
      const epg = nowAndNext(guide, ch.tvgId, minuteTick);
      const chName = ch.name.toLowerCase();
      
      // 1. Tenta match com ESPN
      const espnMatch = espnScores.find(score => 
        score.broadcastChannels?.some(b => chName.includes(b.toLowerCase()))
      );

      if (espnMatch) {
        const eventKey = `espn-${espnMatch.id}`;
        if (!gamesByEvent[eventKey]) {
          gamesByEvent[eventKey] = { score: espnMatch, chs: [] };
        }
        gamesByEvent[eventKey].chs.push({ ch, epg });
        return;
      }

      // 2. Tenta match por EPG (placar/versus)
      if (epg.now) {
        const score = extractFootballScore(epg.now.title, epg.now.description);
        if (score) {
          const eventKey = `epg-${score.teamA.toLowerCase()}-${score.teamB.toLowerCase()}`;
          // Busca um agrupamento existente que possa ser o mesmo jogo
          const existingKey = Object.keys(gamesByEvent).find(k => 
            k.includes(score.teamA.toLowerCase()) && k.includes(score.teamB.toLowerCase())
          );
          
          const key = existingKey || eventKey;
          if (!gamesByEvent[key]) {
            gamesByEvent[key] = { score, chs: [] };
          }
          gamesByEvent[key].chs.push({ ch, epg });
          return;
        }
      }

      // 3. Canais sem jogo detectado mas relevantes
      const nowTitle = epg.now?.title.toLowerCase() || "";
      const isGeneric = nowTitle.includes("programação") || nowTitle.includes("seu servidor favorito") || nowTitle === "" || nowTitle.includes("informação indisponível");
      const isMainSportCh = chName.includes("premiere") || chName.includes("goltv") || chName.includes("sportv") || chName.includes("espn") || chName.includes("tnt sports");

      if (isMainSportCh) {
        standaloneChannels.push({ ch, epg });
      }
    });

    const groupedResults = Object.values(gamesByEvent).map(g => ({
      score: g.score,
      channels: g.chs,
      isGrouped: true
    }));

    const standaloneResults = standaloneChannels.map(s => ({
      score: s.score,
      channels: [{ ch: s.ch, epg: s.epg }],
      isGrouped: false
    }));

    return [...groupedResults, ...standaloneResults]
      .filter(g => !(g.score as any)?.isFinished) // Filtra jogos que já acabaram via ESPN
      .sort((a, b) => {
        const aLive = a.score?.isLive;
        const bLive = b.score?.isLive;
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return 0;
      });
  }, [channels, guide, minuteTick, espnEvents]);

  const open = (item: any) => {
    // Se for um grupo de canais, vamos para a tela de detalhes
    // Se for apenas um canal, vamos direto para o player ou detalhes
    void navigate({ to: "/jogos/$id", params: { id: item.channels[0].ch.id } });
  };

  return (
    <main
      ref={scopeRef as unknown as React.RefObject<HTMLElement>}
      className="vexia-safe flex min-h-[100dvh] flex-col md:h-screen md:overflow-hidden bg-vexia-bg text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,8,0.72), rgba(5,5,8,0.94)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-[4vw]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white tracking-tight italic">Pipoca</span>
            <span className="text-xl font-black text-vexia-primary tracking-tight italic">Flix</span>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-white" aria-hidden />
            <h1 className="text-sm font-black tracking-[0.2em] text-vexia-text uppercase">JOGOS AO VIVO</h1>
            {loadingEspn && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-vexia-primary/10 rounded-full border border-vexia-primary/20">
                <Wifi className="h-3 w-3 text-white animate-pulse" />
                <span className="text-[8px] font-bold text-vexia-primary tracking-widest uppercase">API Live</span>
              </div>
            )}
          </div>
        </div>
        <TopNav active="Jogos" />
        <div className="flex items-center gap-4">
           <div className="h-9 w-9 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/60">
             <div className="relative">
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-black animate-pulse" />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
             </div>
           </div>
           <button onClick={() => navigate({ to: '/configuracoes' })} className="h-9 w-9 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/60 hover:text-white transition-colors">
             <Settings className="w-5 h-5" />
           </button>
        </div>
      </header>

      {!hasContent ? (
        <div className="min-h-0 flex-1 px-3 pb-6 sm:px-[4vw]">
          <EmptyPlaylist section="Os jogos ao vivo" onOpenLists={() => setListsOpen(true)} />
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6 sm:px-[4vw]">

          {/* Destaque Removido conforme solicitado */}

          <h2 className="sr-only">Canais de esporte com jogos ao vivo</h2>
          {loadingEspn && games.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-4 rounded-[40px] border border-white/5 bg-white/5 p-6 backdrop-blur-md">
                  <div className="flex items-center justify-between w-full">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-20 w-full rounded-3xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10 text-white/20">
                <Trophy className="w-10 h-10" />
              </div>
              <p className="text-sm font-bold text-vexia-muted max-w-[200px]">
                ⏳ Nenhum jogo de futebol encontrado no momento.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full">
              {games.map((item, idx) => {
                const { score, channels: itemChannels } = item;
                const mainCh = itemChannels[0].ch;
                const epg = itemChannels[0].epg;

                return (
                  <button
                    key={`${mainCh.id}-${idx}`}
                    type="button"
                    data-nav-row={idx + 1}
                    tabIndex={0}
                    onClick={() => open(item)}
                    className="vexia-focus flex items-center gap-4 rounded-3xl border border-white/5 bg-black/40 p-2 text-left transition-all hover:border-white/20 hover:bg-white/5 backdrop-blur-md group relative shadow-2xl w-full overflow-hidden"
                  >
                    <div className="flex flex-col items-center justify-center w-24 shrink-0 gap-2 border-r border-white/10 pr-2">
                      <div className="relative">
                        <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-white/20 bg-black/80">
                          {mainCh.logo ? (
                            <SmartImage
                              src={mainCh.logo}
                              role="logo"
                              alt=""
                              className="h-full w-full object-contain p-1"
                              fallback={<Tv className="h-5 w-5 text-white" aria-hidden />}
                            />
                          ) : (
                            <Tv className="h-5 w-5 text-white" aria-hidden />
                          )}
                        </span>
                        {item.isGrouped && itemChannels.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-vexia-purple text-[7px] font-black px-1.5 py-0.5 text-white rounded-full border border-black shadow-lg uppercase">
                            +{itemChannels.length - 1}
                          </div>
                        )}
                      </div>
                      <div className="text-[8px] font-black text-white/40 tracking-widest uppercase text-center max-w-[80px] truncate">
                        {mainCh.name}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      {score ? (
                        <FootballLiveScore 
                          score={score} 
                          className="w-full"
                          timeLabel={epg.now ? clock(epg.now.start) : "AGORA"}
                        />
                      ) : (
                        <div className="flex items-center justify-between w-full bg-white/5 p-4 rounded-2xl border border-white/10">
                          <div className="flex flex-col gap-1">
                            <span className="block truncate text-lg font-black text-white uppercase tracking-tight">
                              {epg.now?.title ?? mainCh.name}
                            </span>
                            <span className="block truncate text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              PROGRAMAÇÃO ATUAL
                            </span>
                          </div>
                          <div className="text-sm font-black text-vexia-purple bg-vexia-purple/10 px-4 py-2 rounded-xl border border-vexia-purple/20">
                            {epg.now ? clock(epg.now.start) : "LIVE"}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
    </main>
  );
}
