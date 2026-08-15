import { FootballScore } from "../../lib/football-score";
import { Shield } from "lucide-react";

interface FootballLiveScoreProps {
  score: FootballScore;
  className?: string;
}

export function FootballLiveScore({ score, className = "" }: FootballLiveScoreProps) {
  return (
    <div className={`flex items-center gap-3 bg-black/60 px-3 py-2 rounded-xl border border-white/10 ${className}`}>
      {/* Time A */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="text-xs font-bold truncate text-vexia-text uppercase tracking-tight">
          {score.teamA}
        </span>
        <div className="w-6 h-6 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
          {score.logoA ? (
            <img src={score.logoA} alt={score.teamA} className="w-5 h-5 object-contain" />
          ) : (
            <Shield className="w-4 h-4 text-vexia-muted" />
          )}
        </div>
      </div>

      {/* Placar Central */}
      <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
        <div className="flex items-center gap-1.5 font-black text-lg leading-none">
          <span className="text-vexia-cyan">{score.scoreA}</span>
          <span className="text-white/20 text-xs">-</span>
          <span className="text-vexia-cyan">{score.scoreB}</span>
        </div>
        {score.time && (
          <span className="text-[9px] font-bold text-vexia-purple uppercase mt-0.5 animate-pulse">
            {score.time}
          </span>
        )}
      </div>

      {/* Time B */}
      <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
        <div className="w-6 h-6 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
          {score.logoB ? (
            <img src={score.logoB} alt={score.teamB} className="w-5 h-5 object-contain" />
          ) : (
            <Shield className="w-4 h-4 text-vexia-muted" />
          )}
        </div>
        <span className="text-xs font-bold truncate text-vexia-text uppercase tracking-tight">
          {score.teamB}
        </span>
      </div>
    </div>
  );
}
