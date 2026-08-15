import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Trophy, ArrowLeft, Tv, Wifi, Shield, Play, Info, Maximize } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { usePlaylist } from "../lib/playlist-store";
import { useEpg, useMinuteTick, nowAndNext } from "../hooks/use-epg";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLiveFootballScores, EspnGame } from "../lib/espn.functions";
import { extractFootballScore, FootballScore } from "../lib/football-score";
import { BRAND } from "../lib/brand";
import { setStreamHandoff } from "../lib/stream-handoff";
import { useResilientPlayer } from "../hooks/useResilientPlayer";
import { playableStreamUrl } from "../lib/stream-url";
import { useSpatialNav } from "../hooks/use-spatial-nav";

export const Route = createFileRoute("/jogos/$id")({
  head: () => ({
    meta: [{ title: `Detalhes do Jogo — ${BRAND.name}` }],
  }),
  component: JogoDetalhesPage,
});

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function JogoDetalhesPage() {
  const { id } = useParams({ from: "/jogos/$id" });
  const navigate = useNavigate();
  const { channels } = usePlaylist();
  const { guide } = useEpg();
  const minuteTick = useMinuteTick();
  const [espnEvents, setEspnEvents] = useState<EspnGame[]>([]);

  useEffect(() => {
    getLiveFootballScores().then(data => setEspnEvents(data.events || []));
  }, []);

  const channel = useMemo(() => channels.find(c => c.id === id), [channels, id]);
  
  const gameData = useMemo(() => {
    if (!channel) return null;
    
    const epg = nowAndNext(guide, channel.tvgId, minuteTick);
    const chName = channel.name.toLowerCase();
    
    // Procura na ESPN
    const espnMatch = espnEvents.find(event => 
      event.broadcasts?.[0]?.names.some((b: string) => chName.includes(b.toLowerCase()))
    );

    let score: FootballScore | null = null;
    if (espnMatch) {
      const home = espnMatch.competitors.find(c => c.homeAway === "home");
      const away = espnMatch.competitors.find(c => c.homeAway === "away");
      score = {
        teamA: home?.team.displayName || "",
        scoreA: parseInt(home?.score || "0"),
        teamB: away?.team.displayName || "",
        scoreB: parseInt(away?.score || "0"),
        logoA: home?.team.logo,
        logoB: away?.team.logo,
        time: espnMatch.status.type.state === "in" ? espnMatch.status.displayClock : espnMatch.status.type.description,
        isLive: espnMatch.status.type.state === "in"
      };
    } else if (epg.now) {
      score = extractFootballScore(epg.now.title, epg.now.description);
    }

    // Busca canais alternativos que passam o mesmo jogo
    const alternatives = channels.filter(c => {
      if (c.id === channel.id) return false;
      
      const cName = c.name.toLowerCase();
      // Match via ESPN
      if (espnMatch && espnMatch.broadcasts?.[0]?.names.some(b => cName.includes(b.toLowerCase()))) return true;
      
      // Match via EPG (se tiver o mesmo título do programa agora)
      const cEpg = nowAndNext(guide, c.tvgId, minuteTick);
      if (epg.now && cEpg.now && cEpg.now.title === epg.now.title) return true;
      
      return false;
    });

    return { channel, epg, score, isEspn: !!espnMatch, alternatives };
  }, [channel, guide, minuteTick, espnEvents, channels]);

  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);

  const [activeChannel, setActiveChannel] = useState(channel);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slotARef = useRef<HTMLVideoElement>(null);
  const slotBRef = useRef<HTMLVideoElement>(null);

  // Sincroniza activeChannel quando o canal inicial carrega
  useEffect(() => {
    if (channel && !activeChannel) {
      setActiveChannel(channel);
    }
  }, [channel, activeChannel]);

  const src = useMemo(() => playableStreamUrl(activeChannel?.url || ""), [activeChannel]);

  const resilientPlayer = useResilientPlayer({
    videoRef,
    slotARef,
    slotBRef,
    src,
    live: true,
  });

  if (!gameData || !activeChannel) return null;

  const openFullscreen = () => {
    void navigate({ to: "/player", search: { type: "live", id: activeChannel.id } });
  };

  const { channel: ch, epg, score, alternatives } = gameData;

  const play = (selectedCh = ch) => {
    setActiveChannel(selectedCh);
    setIsPlaying(true);
    setStreamHandoff("live", selectedCh.id, selectedCh.url);
  };

  return (
    <div 
      ref={scopeRef}
      className="min-h-screen bg-vexia-bg text-vexia-text vexia-safe p-4 md:p-6 flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,8,0.85), rgba(5,5,8,0.95)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="w-full max-w-6xl flex items-center justify-between mb-6 md:mb-8 shrink-0">
        <button 
          onClick={() => window.history.back()}
          className="vexia-focus flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Voltar</span>
        </button>
        <VexiaLogo className="h-8 md:h-10" />
      </header>

      <div className="w-full max-w-6xl flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Lado Esquerdo: Player ou Info Principal */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="relative aspect-video w-full bg-black/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl group">
            {isPlaying ? (
              <>
                <video ref={slotARef} className="absolute inset-0 h-full w-full object-contain" muted />
                <video ref={slotBRef} className="absolute inset-0 h-full w-full object-contain" muted />
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-contain" autoPlay />
                
                {resilientPlayer.reconnecting && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 border-4 border-vexia-cyan/30 border-t-vexia-cyan rounded-full animate-spin" />
                      <span className="text-xs font-black text-vexia-cyan uppercase tracking-widest">Reconectando...</span>
                    </div>
                  </div>
                )}

                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">{activeChannel.name}</span>
                </div>

                <button 
                  onClick={openFullscreen}
                  className="absolute bottom-6 right-6 z-20 vexia-focus p-3 bg-vexia-purple rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="w-24 h-24 bg-vexia-purple/20 rounded-full flex items-center justify-center border border-vexia-purple/30 animate-pulse">
                  <Trophy className="w-10 h-10 text-vexia-purple" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Pronto para a Partida</h3>
                  <p className="text-sm text-white/60 max-w-xs mx-auto">Clique em assistir para abrir o sinal ao vivo diretamente aqui.</p>
                </div>
                <button 
                  onClick={() => play()}
                  className="vexia-focus flex items-center justify-center gap-4 px-10 py-4 bg-vexia-purple rounded-full shadow-xl hover:scale-105 transition-all"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span className="text-lg font-black uppercase tracking-tighter">Assistir Agora</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-vexia-purple/20 rounded-full border border-vexia-purple/30">
                  <span className="text-[10px] font-black tracking-widest uppercase text-vexia-purple">
                    {score?.isLive ? "AO VIVO" : "EM BREVE"}
                  </span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter truncate">
                  {score ? `${score.teamA} vs ${score.teamB}` : ch.name}
                </h2>
             </div>
             
             {score && (
                <div className="flex items-center gap-6 bg-white/5 p-4 rounded-3xl border border-white/10 self-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                      {score.logoA ? <img src={score.logoA} className="w-7 h-7 object-contain" alt="" /> : <Shield className="w-6 h-6 text-white/20" />}
                    </div>
                    <span className="text-2xl font-black text-vexia-cyan">{score.scoreA}</span>
                  </div>
                  <span className="text-white/20 font-light italic">VS</span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-vexia-cyan">{score.scoreB}</span>
                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                      {score.logoB ? <img src={score.logoB} className="w-7 h-7 object-contain" alt="" /> : <Shield className="w-6 h-6 text-white/20" />}
                    </div>
                  </div>
                  {score.time && (
                    <div className="ml-4 px-3 py-1 bg-vexia-purple/20 border border-vexia-purple/30 rounded-lg animate-pulse">
                      <span className="text-xs font-black text-vexia-purple uppercase tracking-widest">{score.time}</span>
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>

        {/* Lado Direito: Opções de Canais e Info */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 min-h-0">
          <div className="flex-1 bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <Info className="w-4 h-4 text-vexia-cyan" />
              <span className="text-[10px] font-black text-vexia-cyan uppercase tracking-widest">Transmissões Disponíveis</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0">
              {[ch, ...alternatives].map((altCh) => {
                const isCurrent = altCh.id === activeChannel.id;
                const nameLower = altCh.name.toLowerCase();
                const label = nameLower.includes("fhd") || nameLower.includes("4k") ? "FHD / 4K" : 
                             nameLower.includes("hd+") ? "HD+" : 
                             nameLower.includes("hd") ? "HD" : "SD";

                return (
                  <button
                    key={altCh.id}
                    onClick={() => play(altCh)}
                    className={`vexia-focus w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                      isCurrent 
                      ? 'bg-vexia-purple/20 border-vexia-purple/50 shadow-lg' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 shrink-0 bg-black rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                      {altCh.logo ? (
                        <img src={altCh.logo} className="w-full h-full object-contain p-1" alt="" />
                      ) : (
                        <Tv className="w-5 h-5 text-vexia-cyan/50" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`block text-xs font-black truncate ${isCurrent ? 'text-white' : 'text-white/70'}`}>
                        {altCh.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 rounded-md border ${
                          isCurrent ? 'bg-vexia-cyan/20 border-vexia-cyan/30 text-vexia-cyan' : 'bg-white/5 border-white/10 text-white/40'
                        }`}>
                          {label}
                        </span>
                        {isCurrent && isPlaying && (
                          <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1">
                            <Wifi className="w-2 h-2" /> ONLINE
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 shrink-0">
               <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="block text-[9px] font-black text-vexia-cyan uppercase tracking-widest opacity-60 mb-2">Guia de Programação</span>
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-snug mb-2">
                    {epg.now?.title || "Programação indisponível"}
                  </p>
                  {epg.now && (
                    <div className="flex items-center gap-2 text-[9px] text-white/40 font-black uppercase">
                      <span>{clock(epg.now.start)}</span>
                      <div className="w-1 h-1 bg-white/20 rounded-full" />
                      <span>{clock(epg.now.stop)}</span>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
