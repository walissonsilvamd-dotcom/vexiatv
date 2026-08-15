import { FootballScore } from "../../lib/football-score";
import { Shield, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getCachedTeamLogo } from "../../lib/logo-cache";
import { Skeleton } from "../ui/skeleton";

interface FootballLiveScoreProps {
  score: FootballScore;
  className?: string;
  timeLabel?: string;
}

export function FootballLiveScore({ score, className = "", timeLabel }: FootballLiveScoreProps) {
  const [logoA, setLogoA] = useState<string | undefined>(score.logoA);
  const [logoB, setLogoB] = useState<string | undefined>(score.logoB);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(false);
  const [errorB, setErrorB] = useState(false);

  useEffect(() => {
    setLogoA(score.logoA);
    setLogoB(score.logoB);
    setErrorA(false);
    setErrorB(false);
  }, [score.logoA, score.logoB]);

  useEffect(() => {
    async function fetchLogos() {
      if (!logoA && score.teamA && !errorA) {
        setLoadingA(true);
        try {
          const logo = await searchTeamLogo({ data: { teamName: score.teamA } });
          if (logo) {
            setLogoA(logo);
          } else {
            setErrorA(true);
          }
        } catch (e) {
          console.error("Falha ao buscar logo A:", e);
          setErrorA(true);
        } finally {
          setLoadingA(false);
        }
      }
      if (!logoB && score.teamB && !errorB) {
        setLoadingB(true);
        try {
          const logo = await searchTeamLogo({ data: { teamName: score.teamB } });
          if (logo) {
            setLogoB(logo);
          } else {
            setErrorB(true);
          }
        } catch (e) {
          console.error("Falha ao buscar logo B:", e);
          setErrorB(true);
        } finally {
          setLoadingB(false);
        }
      }
    }
    fetchLogos();
  }, [score.teamA, score.teamB]);

  return (
    <div className={`flex items-center gap-4 w-full p-2 rounded-2xl transition-all ${className}`}>
      {/* Coluna Liga/Status */}
      <div className="flex flex-col items-center justify-center gap-2 w-20 shrink-0 bg-white/5 p-3 rounded-2xl border border-white/5 overflow-hidden">
        {score.leagueLogo ? (
          <img 
            src={score.leagueLogo} 
            alt={score.league} 
            className="w-8 h-8 object-contain opacity-60"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <Trophy className={`w-6 h-6 text-white/20 ${score.leagueLogo ? 'hidden' : ''}`} />
        {score.league && (
          <span className="text-[8px] font-black text-white/40 uppercase text-center leading-tight">
            {score.league}
          </span>
        )}
      </div>

      {/* Grid Principal - Estilo Tabela do Mockup */}
      <div className="flex-1 flex items-center bg-black/40 rounded-2xl border border-white/10 p-4 shadow-xl backdrop-blur-md relative overflow-hidden">
        {/* Fundo decorativo se estiver ao vivo */}
        {score.isLive && (
          <div className="absolute inset-0 bg-vexia-purple/5 animate-pulse pointer-events-none" />
        )}

        {/* Time A */}
        <div className="flex items-center gap-4 flex-1 justify-end pr-4 border-r border-white/5">
          <span className="text-sm font-black text-white uppercase tracking-tighter text-right">
            {score.teamA}
          </span>
          <div className="w-12 h-12 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative">
            {loadingA ? (
              <Skeleton className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
            ) : logoA ? (
              <img 
                src={logoA} 
                alt={score.teamA} 
                className="w-9 h-9 object-contain"
                onError={() => {
                  setLogoA(undefined);
                  setErrorA(true);
                }}
              />
            ) : (
              <Shield className="w-6 h-6 text-white/20" />
            )}
          </div>
        </div>

        {/* Centro: Placar e Tempo */}
        <div className="flex flex-col items-center justify-center px-8 min-w-[120px]">
          <div className="flex items-center gap-4 font-black text-4xl leading-none tracking-tighter">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{score.scoreA}</span>
            <div className="flex flex-col items-center gap-1">
              {score.isLive ? (
                <div className="text-[10px] font-black text-red-500 uppercase animate-pulse mb-1">
                  {score.time || "EM ANDAMENTO"}
                </div>
              ) : (
                <div className="text-lg font-light text-white/20">:</div>
              )}
            </div>
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{score.scoreB}</span>
          </div>
          
          {timeLabel && !score.isLive && (
             <div className="mt-1 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
               {timeLabel}
             </div>
          )}
        </div>

        {/* Time B */}
        <div className="flex items-center gap-4 flex-1 justify-start pl-4 border-l border-white/5">
          <div className="w-12 h-12 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative">
            {loadingB ? (
              <Skeleton className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
            ) : logoB ? (
              <img 
                src={logoB} 
                alt={score.teamB} 
                className="w-9 h-9 object-contain"
                onError={() => {
                  setLogoB(undefined);
                  setErrorB(true);
                }}
              />
            ) : (
              <Shield className="w-6 h-6 text-white/20" />
            )}
          </div>
          <span className="text-sm font-black text-white uppercase tracking-tighter">
            {score.teamB}
          </span>
        </div>
      </div>
    </div>
  );
}
