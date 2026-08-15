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

  // Escudo substituto com as iniciais do time (nunca fica vazio)
  const initials = (name: string) =>
    cleanTeamName(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  const FallbackCrest = ({ name }: { name: string }) => (
    <div className="w-full h-full rounded-full bg-primary/25 border border-white/20 flex items-center justify-center">
      <span className="text-[13px] font-black text-white tracking-tight">{initials(name)}</span>
    </div>
  );


  return (
    <div className={`flex items-center gap-2 w-full p-1 rounded-xl transition-all ${className}`}>
      {/* Grid Principal - Estilo Compacto */}
      <div className="flex-1 flex items-center bg-black/60 rounded-xl border border-white/10 p-2 shadow-lg backdrop-blur-md relative overflow-hidden min-h-[100px]">
        {/* Fundo decorativo se estiver ao vivo */}
        {score.isLive && (
          <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
        )}

        {/* Time A */}
        <div className="flex items-center gap-4 flex-1 justify-end pr-4 border-r border-white/5">
          <div className="flex flex-col items-end flex-1 min-w-0">
            <span className="text-[12px] font-black text-white uppercase tracking-tighter text-right leading-tight break-words w-full">
              {cleanTeamName(score.teamA)}
            </span>
          </div>
          <div className="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden relative">
            {loadingA ? (
              <Skeleton className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            ) : logoA ? (
              <img 
                src={logoA} 
                alt={score.teamA} 
                className="w-full h-full object-contain"
                onError={() => {
                  setLogoA(undefined);
                  setErrorA(true);
                }}
              />
            ) : (
              <Shield className="w-8 h-8 text-white/20" />
            )}
          </div>
        </div>

        {/* Centro: Placar e Tempo */}
        <div className="flex flex-col items-center justify-center px-6 min-w-[90px]">
          <div className="flex items-center gap-3 font-black text-3xl leading-none tracking-tighter">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              {(score.isLive || (score as any).isFinished) ? score.scoreA : ""}
            </span>
            <div className="flex flex-col items-center">
              {score.isLive ? (
                <div className="text-[9px] font-black text-red-500 uppercase animate-pulse flex flex-col items-center">
                  <span className="bg-red-500 text-white px-1 rounded-[2px] mb-1 scale-75">LIVE</span>
                  {score.time || "EM ANDAMENTO"}
                </div>
              ) : (score as any).isFinished ? (
                <div className="text-[9px] font-black text-white/40 uppercase">
                  FINALIZADO
                </div>
              ) : (
                <div className="text-sm font-black text-white/60 tracking-widest px-3 py-1 bg-white/5 rounded-md border border-white/10">
                  VS
                </div>
              )}
            </div>
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              {(score.isLive || (score as any).isFinished) ? score.scoreB : ""}
            </span>
          </div>
        </div>

        {/* Time B */}
        <div className="flex items-center gap-4 flex-1 justify-start pl-4 border-l border-white/5">
          <div className="w-16 h-16 shrink-0 flex items-center justify-center overflow-hidden relative">
            {loadingB ? (
              <Skeleton className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            ) : logoB ? (
              <img 
                src={logoB} 
                alt={score.teamB} 
                className="w-full h-full object-contain"
                onError={() => {
                  setLogoB(undefined);
                  setErrorB(true);
                }}
              />
            ) : (
              <Shield className="w-8 h-8 text-white/20" />
            )}
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-[12px] font-black text-white uppercase tracking-tighter leading-tight break-words w-full">
              {cleanTeamName(score.teamB)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
