import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Trophy, ArrowLeft, Tv, Wifi, Shield, Play } from "lucide-react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { usePlaylist } from "../lib/playlist-store";
import { useEpg, useMinuteTick, nowAndNext } from "../hooks/use-epg";
import { useEffect, useMemo, useState } from "react";
import { getLiveFootballScores, EspnGame } from "../lib/espn.functions";
import { extractFootballScore, FootballScore } from "../lib/football-score";
import { BRAND } from "../lib/brand";
import { setStreamHandoff } from "../lib/stream-handoff";

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

  if (!gameData) return null;

  const { channel: ch, epg, score, alternatives } = gameData;

  const play = (selectedCh = ch) => {
    setStreamHandoff("live", selectedCh.id, selectedCh.url);
    void navigate({ to: "/player", search: { type: "live", id: selectedCh.id } });
  };

  return (
    <div 
      className="min-h-screen bg-vexia-bg text-vexia-text vexia-safe p-6 flex flex-col items-center"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,8,0.85), rgba(5,5,8,0.95)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="w-full max-w-5xl flex items-center justify-between mb-12">
        <button 
          onClick={() => window.history.back()}
          className="vexia-focus flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold">Voltar</span>
        </button>
        <VexiaLogo className="h-10" />
      </header>

      <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl">
        <div className="flex flex-col items-center gap-8">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-4 py-1.5 bg-vexia-purple/20 rounded-full border border-vexia-purple/30">
            <Trophy className="w-4 h-4 text-vexia-purple" />
            <span className="text-xs font-black tracking-widest uppercase text-vexia-purple">
              {score?.isLive ? "Partida ao Vivo" : "Detalhes do Evento"}
            </span>
          </div>

          {/* Confronto Principal */}
          <div className="w-full flex items-center justify-between gap-4 md:gap-12">
            {/* Time A */}
            <div className="flex-1 flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl relative group">
                <div className="absolute inset-0 bg-vexia-purple/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                {score?.logoA ? (
                  <img src={score.logoA} alt={score.teamA} className="w-16 h-16 md:w-20 md:h-20 object-contain relative z-10" />
                ) : (
                  <Shield className="w-12 h-12 md:w-16 md:h-16 text-white/20 relative z-10" />
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight max-w-[150px]">
                {score?.teamA || ch.name}
              </h2>
            </div>

            {/* Placar / Horário */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4 md:gap-8">
                <span className="text-5xl md:text-7xl font-black text-vexia-cyan drop-shadow-[0_0_15px_rgba(0,200,255,0.5)]">
                  {score?.scoreA ?? "-"}
                </span>
                <span className="text-2xl md:text-4xl font-light text-white/20 italic">VS</span>
                <span className="text-5xl md:text-7xl font-black text-vexia-cyan drop-shadow-[0_0_15px_rgba(0,200,255,0.5)]">
                  {score?.scoreB ?? "-"}
                </span>
              </div>
              {score?.time && (
                <div className="px-4 py-1 bg-vexia-purple/10 border border-vexia-purple/20 rounded-lg animate-pulse">
                  <span className="text-sm font-black text-vexia-purple uppercase tracking-widest">{score.time}</span>
                </div>
              )}
            </div>

            {/* Time B */}
            <div className="flex-1 flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-2xl relative group">
                <div className="absolute inset-0 bg-vexia-purple/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                {score?.logoB ? (
                  <img src={score.logoB} alt={score.teamB} className="w-16 h-16 md:w-20 md:h-20 object-contain relative z-10" />
                ) : (
                  <Shield className="w-12 h-12 md:w-16 md:h-16 text-white/20 relative z-10" />
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight max-w-[150px]">
                {score?.teamB || "Confronto"}
              </h2>
            </div>
          </div>

          <hr className="w-full border-white/5 my-4" />

          {/* Info do Canal e EPG */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center gap-4">
              <div className="w-16 h-16 bg-black rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                {ch.logo ? (
                  <img src={ch.logo} alt={ch.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <Tv className="w-8 h-8 text-vexia-cyan" />
                )}
              </div>
              <div>
                <span className="block text-[10px] font-black text-vexia-cyan uppercase tracking-widest opacity-60">Transmissão</span>
                <span className="block text-lg font-black text-white uppercase tracking-tighter">{ch.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] text-green-500 font-bold uppercase">Sinal Online</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
              <span className="block text-[10px] font-black text-vexia-cyan uppercase tracking-widest opacity-60 mb-2">Agora no Canal</span>
              <p className="text-sm font-bold text-white line-clamp-2 leading-snug">
                {epg.now?.title || "Sem informações de programação no momento."}
              </p>
              {epg.now && (
                <div className="flex items-center gap-2 mt-3 text-[10px] text-vexia-muted font-bold uppercase">
                  <span>{clock(epg.now.start)}</span>
                  <span>—</span>
                  <span>{clock(epg.now.stop)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Canais Alternativos (Opções de Qualidade) */}
          {alternatives.length > 0 && (
            <div className="w-full">
              <span className="block text-[10px] font-black text-vexia-cyan uppercase tracking-widest opacity-60 mb-4 text-center">
                Disponível em outros canais (Qualidades)
              </span>
              <div className="flex flex-wrap justify-center gap-3">
                {[ch, ...alternatives].map((altCh) => {
                  const nameLower = altCh.name.toLowerCase();
                  const label = nameLower.includes("fhd") || nameLower.includes("4k") ? "FHD / 4K" : 
                               nameLower.includes("hd+") ? "HD+" : 
                               nameLower.includes("hd") ? "HD" : "SD";
                  
                  const isCurrent = altCh.id === ch.id;

                  return (
                    <button
                      key={altCh.id}
                      onClick={() => play(altCh)}
                      className={`vexia-focus px-5 py-3 rounded-2xl border transition-all flex flex-col items-center min-w-[120px] ${
                        isCurrent 
                        ? 'bg-vexia-purple/20 border-vexia-purple/50 shadow-[0_0_15px_rgba(123,43,190,0.3)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs font-black text-white truncate max-w-[100px]">{altCh.name}</span>
                      <span className={`text-[9px] font-bold uppercase mt-1 ${isCurrent ? 'text-vexia-cyan' : 'text-vexia-muted'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de Ação Principal */}
          <button 
            onClick={() => play()}
            className="vexia-focus mt-8 flex items-center justify-center gap-4 w-full md:w-auto md:px-16 py-5 bg-vexia-purple rounded-[2rem] shadow-[0_0_40px_rgba(123,43,190,0.5)] hover:scale-[1.05] active:scale-95 transition-all group"
          >
            <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
            <span className="text-lg font-black uppercase tracking-tighter">Assistir Agora</span>
          </button>

        </div>
      </div>
    </div>
  );
}
