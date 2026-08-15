import { FootballScore } from "../../lib/football-score";
import { Shield } from "lucide-react";

interface FootballLiveScoreProps {
  score: FootballScore;
  className?: string;
  timeLabel?: string;
}

export function FootballLiveScore({ score, className = "", timeLabel }: FootballLiveScoreProps) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {timeLabel && !score.time && (
        <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider ml-1">
          {timeLabel}
        </div>
      )}
      
      <div className="flex flex-col gap-2 bg-black/60 px-4 py-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md w-full">
        {/* Placar e Escudos */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Time A */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              {score.logoA ? (
                <img src={score.logoA} alt={score.teamA} className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
              ) : (
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white/20" />
              )}
            </div>
            <span className="text-[13px] sm:text-sm font-black text-white uppercase tracking-tighter leading-tight break-words">
              {score.teamA}
            </span>
          </div>

          {/* Placar Central */}
          <div className="flex flex-col items-center justify-center px-2 shrink-0">
            {score.scoreA === 0 && score.scoreB === 0 && !score.isLive ? (
              <div className="text-white text-[12px] font-black tracking-[0.2em] bg-white/10 px-2.5 py-1 rounded-lg border border-white/20 uppercase">
                VS
              </div>
            ) : (
              <div className="flex items-center gap-2 font-black text-2xl sm:text-3xl leading-none tracking-tighter">
                <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{score.scoreA}</span>
                <span className="text-white/20 text-sm font-light">-</span>
                <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{score.scoreB}</span>
              </div>
            )}
          </div>

          {/* Time B */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <span className="text-[13px] sm:text-sm font-black text-white uppercase tracking-tighter leading-tight text-right break-words">
              {score.teamB}
            </span>
            <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
              {score.logoB ? (
                <img src={score.logoB} alt={score.teamB} className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
              ) : (
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white/20" />
              )}
            </div>
          </div>
        </div>

        {/* Tempo de Jogo */}
        {score.time && (
          <div className="flex justify-center w-full">
            <span className="text-[9px] sm:text-[10px] font-black text-white uppercase animate-pulse tracking-[0.1em] bg-red-600/20 px-2 py-0.5 rounded-lg border border-red-600/30">
              {score.time}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
