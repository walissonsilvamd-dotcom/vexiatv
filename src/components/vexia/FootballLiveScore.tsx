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
        <div className="text-[10px] font-bold text-vexia-cyan/70 uppercase tracking-wider ml-1">
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
        <div className="flex flex-col items-center justify-center px-1 min-w-[55px]">
          <div className="flex items-center gap-2 font-black text-xl leading-none tracking-tighter">
            <span className="text-vexia-cyan drop-shadow-[0_0_8px_rgba(0,200,255,0.4)]">{score.scoreA}</span>
            <span className="text-white/10 text-xs font-light">x</span>
            <span className="text-vexia-cyan drop-shadow-[0_0_8px_rgba(0,200,255,0.4)]">{score.scoreB}</span>
          </div>
          {score.time && (
            <span className="text-[8px] font-black text-vexia-purple uppercase mt-1 animate-pulse tracking-widest bg-vexia-purple/10 px-1.5 py-0.5 rounded-full border border-vexia-purple/20">
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
