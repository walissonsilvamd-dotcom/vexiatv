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
    const sports = channels.filter((c) => isSport(c.name, c.category, c.group));
    
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

    return sports
      .map((ch) => {
        const epg = nowAndNext(guide, ch.tvgId, minuteTick);
        
        // Tenta encontrar um jogo ESPN que esteja passando neste canal
        const chName = ch.name.toLowerCase();
        const espnMatch = espnScores.find(score => 
          score.broadcastChannels?.some(b => chName.includes(b.toLowerCase()))
        );

        return { 
          ch, 
          epg,
          espnScore: espnMatch
        };
      })
      // Filtra e prioriza canais de esporte relevantes
      .filter((item) => {
        if (item.espnScore) return true;

        const nowTitle = item.epg.now?.title.toLowerCase() || "";
        const nextTitle = item.epg.next?.title.toLowerCase() || "";
        
        if (item.epg.now) {
          const score = extractFootballScore(item.epg.now.title, item.epg.now.description);
          if (score && !score.isLive) return false;
        }

        const footHints = ["futebol", "soccer", "jogo", "partida", "vs", " x ", "brasileirão", "libertadores", "champions"];
        const isFootNow = footHints.some(h => nowTitle.includes(h));
        const isFootNext = footHints.some(h => nextTitle.includes(h));
        const isPremiere = chName.includes("premiere") || chName.includes("goltv") || chName.includes("sportv") || chName.includes("espn");
        
        return isFootNow || isFootNext || isPremiere;
      })
      .sort((a, b) => {
        // Prioridade 1: Jogos com dados da ESPN ou placar detectado (ao vivo agora)
        const aHasScore = a.espnScore || (a.epg.now && extractFootballScore(a.epg.now.title, a.epg.now.description));
        const bHasScore = b.espnScore || (b.epg.now && extractFootballScore(b.epg.now.title, b.epg.now.description));
        
        if (aHasScore && !bHasScore) return -1;
        if (!aHasScore && bHasScore) return 1;

        return Number(Boolean(b.epg.now)) - Number(Boolean(a.epg.now));
      });
  }, [channels, guide, minuteTick, espnEvents]);

  const open = (ch: PlaylistChannel) => {
    setStreamHandoff("live", ch.id, ch.url);
    void navigate({ to: "/player", search: { type: "live", id: ch.id } });
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
              {games.map(({ ch, epg, espnScore }) => {
                const progress = epg.now
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        ((minuteTick - epg.now.start) /
                          Math.max(1, epg.now.stop - epg.now.start)) *
                          100,
                      ),
                    )
                  : 0;
                
                const score = espnScore || 
                  (epg.now ? extractFootballScore(epg.now.title, epg.now.description) : null) ||
                  (epg.next ? extractFootballScore(epg.next.title, epg.next.description) : null);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    data-nav-row={1}
                    tabIndex={0}
                    onClick={() => open(ch)}
                    className="vexia-focus flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/45 p-3 text-left transition-all hover:border-vexia-purple/50 hover:bg-vexia-purple/15"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/70">
                      {ch.logo ? (
                        <SmartImage
                          src={ch.logo}
                          role="logo"
                          alt=""
                          className="h-full w-full object-contain p-0.5"
                          fallback={<Tv className="h-5 w-5 text-vexia-cyan" aria-hidden />}
                        />
                      ) : (
                        <Tv className="h-5 w-5 text-vexia-cyan" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {score ? (
                        <FootballLiveScore 
                          score={score} 
                          className="mb-1"
                          timeLabel={espnScore ? `${ch.name} • ESPN LIVE` : (epg.now ? `${ch.name} • AO VIVO` : `${ch.name} • ${clock(epg.next!.start)}`)}
                        />
                      ) : (
                        <>
                          <span className="block truncate text-sm font-bold text-vexia-text">
                            {epg.now?.title ?? ch.name}
                          </span>
                          <span className="block truncate text-[10px] font-bold text-vexia-cyan/70 uppercase tracking-tighter mt-0.5">
                            {epg.now
                              ? `${ch.name} • ${clock(epg.now.start)}`
                              : ch.name}
                          </span>
                        </>
                      )}

                      
                      {epg.now ? (
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan"
                            style={{ width: `${Math.round(progress)}%` }}
                          />
                        </span>
                      ) : null}
                      {epg.next ? (
                        <span className="mt-1 block truncate text-[10px] text-vexia-muted">
                          A seguir: {epg.next.title}
                        </span>
                      ) : null}
                    </span>
                    <Play className="h-4 w-4 shrink-0 text-vexia-cyan" aria-hidden />
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
