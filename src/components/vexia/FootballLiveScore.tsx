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
      
      <div className="flex items-center gap-3 bg-black/60 px-3 py-2.5 rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm">
        {/* Time A */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <span className="text-[11px] font-black truncate text-vexia-text uppercase tracking-tighter leading-none">
            {score.teamA}
          </span>
          <div className="w-7 h-7 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
            {score.logoA ? (
              <img src={score.logoA} alt={score.teamA} className="w-5 h-5 object-contain" />
            ) : (
              <Shield className="w-4 h-4 text-vexia-muted/50" />
            )}
          </div>
        </div>

        {/* Placar Central */}
        <div className="flex flex-col items-center justify-center px-1 min-w-[65px]">
          {score.scoreA === 0 && score.scoreB === 0 && !score.isLive ? (
            <div className="text-white/60 text-xs font-black tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/10 uppercase">
              VS
            </div>
          ) : (
            <div className="flex items-center gap-2 font-black text-xl leading-none tracking-tighter">
              <span className="text-vexia-primary drop-shadow-[0_0_10px_rgba(82,0,165,0.5)]">{score.scoreA}</span>
              <span className="text-white/20 text-xs font-light">x</span>
              <span className="text-vexia-primary drop-shadow-[0_0_10px_rgba(82,0,165,0.5)]">{score.scoreB}</span>
            </div>
          )}
          {score.time && (
            <span className="text-[9px] font-black text-white uppercase mt-1 animate-pulse tracking-widest bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
              {score.time}
            </span>
          )}
        </div>

        {/* Time B */}
        <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
          <div className="w-7 h-7 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-inner">
            {score.logoB ? (
              <img src={score.logoB} alt={score.teamB} className="w-5 h-5 object-contain" />
            ) : (
              <Shield className="w-4 h-4 text-vexia-muted/50" />
            )}
          </div>
          <span className="text-[11px] font-black truncate text-vexia-text uppercase tracking-tighter leading-none">
            {score.teamB}
          </span>
        </div>
      </div>
    </div>
  );
}
