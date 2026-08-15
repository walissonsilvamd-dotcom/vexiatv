import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Play, Tv, Wifi } from "lucide-react";
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
    const sports = channels.filter((c) => isSport(c.name, c.category, c.group) && (c.name.toLowerCase().includes("futebol") || c.category.toLowerCase().includes("futebol") || c.group.toLowerCase().includes("futebol")));
    
    // Converte eventos ESPN para nosso formato de placar
    const espnScores = espnEvents.map(event => {
      const home = event.competitors.find(c => c.homeAway === "home");
      const away = event.competitors.find(c => c.homeAway === "away");
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
        broadcastChannels: event.broadcasts?.[0]?.names || []
      } as FootballScore;
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

      if (isMainSportCh && !isGeneric) {
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

    return [...groupedResults, ...standaloneResults].sort((a, b) => {
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
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-vexia-cyan" aria-hidden />
          <h1 className="text-sm font-black tracking-[0.2em] text-vexia-text uppercase">JOGOS AO VIVO</h1>
          {loadingEspn && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-vexia-cyan/10 rounded-full border border-vexia-cyan/20">
              <Wifi className="h-3 w-3 text-vexia-cyan animate-pulse" />
              <span className="text-[8px] font-bold text-vexia-cyan tracking-widest uppercase">API Live</span>
            </div>
          )}
        </div>
        <TopNav />
        <VexiaLogo className="h-9" />
      </header>

      {!hasContent ? (
        <div className="min-h-0 flex-1 px-3 pb-6 sm:px-[4vw]">
          <EmptyPlaylist section="Os jogos ao vivo" onOpenLists={() => setListsOpen(true)} />
        </div>
      ) : (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6 sm:px-[4vw]">
          <h2 className="sr-only">Canais de esporte com jogos ao vivo</h2>
          {games.length === 0 ? (
            <p className="py-16 text-center text-sm text-vexia-muted">
              Nenhum canal de esportes encontrado na sua lista.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {games.map((item, idx) => {
                const { score, channels: itemChannels } = item;
                const mainCh = itemChannels[0].ch;
                const epg = itemChannels[0].epg;

                return (
                  <button
                    key={`${mainCh.id}-${idx}`}
                    type="button"
                    data-nav-row={1}
                    tabIndex={0}
                    onClick={() => open(item)}
                    className="vexia-focus flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/45 p-3 text-left transition-all hover:border-vexia-purple/50 hover:bg-vexia-purple/15"
                  >
                    <div className="relative shrink-0">
                      <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/70">
                        {mainCh.logo ? (
                          <SmartImage
                            src={mainCh.logo}
                            role="logo"
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                            fallback={<Tv className="h-5 w-5 text-vexia-cyan" aria-hidden />}
                          />
                        ) : (
                          <Tv className="h-5 w-5 text-vexia-cyan" aria-hidden />
                        )}
                      </span>
                      {item.isGrouped && itemChannels.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-vexia-cyan text-[8px] font-black px-1.5 rounded-full border border-black shadow-lg">
                          +{itemChannels.length - 1}
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      {score ? (
                        <FootballLiveScore 
                          score={score} 
                          className="mb-1"
                          timeLabel={item.isGrouped ? `${score.teamA} x ${score.teamB}` : (epg.now ? `${mainCh.name} • AO VIVO` : `${mainCh.name} • ${clock(epg.next!.start)}`)}
                        />
                      ) : (
                        <>
                          <span className="block truncate text-sm font-bold text-vexia-text">
                            {epg.now?.title ?? mainCh.name}
                          </span>
                          <span className="block truncate text-[10px] font-bold text-vexia-cyan/70 uppercase tracking-tighter mt-0.5">
                            {epg.now
                              ? `${mainCh.name} • ${clock(epg.now.start)}`
                              : mainCh.name}
                          </span>
                        </>
                      )}
                    </span>
                    <Play className="h-4 w-4 shrink-0 text-vexia-cyan opacity-40 group-hover:opacity-100" aria-hidden />
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
