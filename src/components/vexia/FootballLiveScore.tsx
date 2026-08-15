import { FootballScore } from "../../lib/football-score";
import { Shield } from "lucide-react";
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
          const logo = await getCachedTeamLogo(score.teamA);
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
          const logo = await getCachedTeamLogo(score.teamB);
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

  const cleanTeamName = (name: string) => {
    return name
      .replace(/(\s|\b)ao vivo(\s|\b)/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/^-+\s*|\s*-+$/g, "") // Remove hífens no início ou fim
      .trim();
  };

  return (
    <div className={`flex items-center gap-2 w-full p-1 rounded-xl transition-all ${className}`}>
      {/* Grid Principal - Estilo Compacto */}
      <div className="flex-1 flex items-center bg-black/60 rounded-xl border border-white/10 p-2 shadow-lg backdrop-blur-md relative overflow-hidden">
        {/* Fundo decorativo se estiver ao vivo */}
        {score.isLive && (
          <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
        )}

        {/* Time A */}
        <div className="flex items-center gap-3 flex-1 justify-end pr-3 border-r border-white/5">
          <div className="flex flex-col items-end">
            <span className="text-[11px] font-black text-white uppercase tracking-tighter text-right leading-tight break-words max-w-[120px]">
              {cleanTeamName(score.teamA)}
            </span>
            {score.league && (
              <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {score.league}
              </span>
            )}
          </div>
          <div className="w-9 h-9 shrink-0 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative">
            {loadingA ? (
              <Skeleton className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
            ) : logoA ? (
              <img 
                src={logoA} 
                alt={score.teamA} 
                className="w-7 h-7 object-contain"
                onError={() => {
                  setLogoA(undefined);
                  setErrorA(true);
                }}
              />
            ) : (
              <Shield className="w-4 h-4 text-white/20" />
            )}
          </div>
        </div>

        {/* Centro: Placar e Tempo */}
        <div className="flex flex-col items-center justify-center px-4 min-w-[70px]">
          <div className="flex items-center gap-2 font-black text-2xl leading-none tracking-tighter">
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{score.scoreA}</span>
            <div className="flex flex-col items-center">
              {score.isLive ? (
                <div className="text-[8px] font-black text-red-500 uppercase animate-pulse">
                  {score.time || "LIVE"}
                </div>
              ) : (
                <div className="text-sm font-light text-white/20">:</div>
              )}
            </div>
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{score.scoreB}</span>
          </div>
        </div>

        {/* Time B */}
        <div className="flex items-center gap-3 flex-1 justify-start pl-3 border-l border-white/5">
          <div className="w-9 h-9 shrink-0 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shadow-inner overflow-hidden relative">
            {loadingB ? (
              <Skeleton className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
            ) : logoB ? (
              <img 
                src={logoB} 
                alt={score.teamB} 
                className="w-7 h-7 object-contain"
                onError={() => {
                  setLogoB(undefined);
                  setErrorB(true);
                }}
              />
            ) : (
              <Shield className="w-4 h-4 text-white/20" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-black text-white uppercase tracking-tighter leading-tight break-words max-w-[120px]">
              {cleanTeamName(score.teamB)}
            </span>
            {score.league && (
              <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                {score.league}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
