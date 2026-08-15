import { FootballScore } from "../../lib/football-score";
import { Shield } from "lucide-react";

interface FootballLiveScoreProps {
  score: FootballScore;
  className?: string;
  timeLabel?: string;
}

export function FootballLiveScore({ score, className = "", timeLabel }: FootballLiveScoreProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {timeLabel && !score.time && (
        <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider ml-1">
          {timeLabel}
        </div>
      )}
      
      <div className="flex items-center gap-4 sm:gap-8 bg-black/60 px-4 sm:px-8 py-5 rounded-[32px] border border-white/10 shadow-lg backdrop-blur-md">
        {/* Time A */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 justify-end min-w-0">
          <span className="text-base sm:text-lg font-black truncate text-white uppercase tracking-tighter leading-tight text-right">
            {score.teamA}
          </span>
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
            {score.logoA ? (
              <img src={score.logoA} alt={score.teamA} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
            )}
          </div>
        </div>

        {/* Placar Central */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[100px] sm:min-w-[140px]">
          {score.scoreA === 0 && score.scoreB === 0 && !score.isLive ? (
            <div className="text-white text-lg sm:text-xl font-black tracking-[0.2em] bg-white/10 px-5 py-2.5 rounded-2xl border border-white/20 uppercase shadow-glow-white">
              VS
            </div>
          ) : (
            <div className="flex items-center gap-4 sm:gap-6 font-black text-4xl sm:text-6xl leading-none tracking-tighter">
              <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{score.scoreA}</span>
              <span className="text-white/20 text-xl font-light">-</span>
              <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">{score.scoreB}</span>
            </div>
          )}
          {score.time && (
            <span className="text-[11px] sm:text-[13px] font-black text-white uppercase mt-3 animate-pulse tracking-[0.15em] bg-red-600/20 px-4 py-1.5 rounded-xl border border-red-600/30">
              {score.time}
            </span>
          )}
        </div>

        {/* Time B */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 justify-start min-w-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
            {score.logoB ? (
              <img src={score.logoB} alt={score.teamB} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white/20" />
            )}
          </div>
          <span className="text-base sm:text-lg font-black truncate text-white uppercase tracking-tighter leading-tight">
            {score.teamB}
          </span>
        </div>
      </div>
    </div>
  );
}
