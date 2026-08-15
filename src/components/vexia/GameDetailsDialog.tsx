import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { FootballScore } from "../../lib/football-score";
import { Tv, Shield, Zap, Info, Play, Maximize } from "lucide-react";
import { SmartImage } from "./SmartImage";
import { useNavigate } from "@tanstack/react-router";

interface GameDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  game: {
    score?: FootballScore;
    channels: { ch: any; epg: any }[];
    isGrouped: boolean;
  } | null;
}

export function GameDetailsDialog({ open, onClose, game }: GameDetailsDialogProps) {
  const navigate = useNavigate();
  if (!game) return null;

  const { score, channels } = game;

  const handleWatch = (chId: string) => {
    onClose();
    void navigate({ to: "/jogos/$id", params: { id: chId } });
  };

  const handlePlayer = (chId: string) => {
    onClose();
    void navigate({ to: "/player", search: { type: "live", id: chId } });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl bg-vexia-popup border-white/10 text-white rounded-[2rem] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="p-8 space-y-8">
          <DialogHeader className="mb-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full self-start mb-4">
               <Trophy className="w-3 h-3 text-vexia-purple" />
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                 {score?.league || "Futebol ao Vivo"}
               </span>
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none">
              Detalhes da Partida
            </DialogTitle>
          </DialogHeader>

          {/* Placar Principal */}
          {score && (
            <div className="bg-black/40 border border-white/10 rounded-[2.5rem] p-8 flex items-center justify-between gap-6 shadow-inner">
              {/* Time A */}
              <div className="flex flex-col items-center gap-4 flex-1">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg relative overflow-hidden">
                  {score.logoA ? (
                    <img src={score.logoA} className="w-14 h-14 object-contain" alt={score.teamA} />
                  ) : (
                    <Shield className="w-10 h-10 text-white/20" />
                  )}
                </div>
                <span className="text-sm font-black text-center uppercase tracking-tight max-w-[120px] leading-tight">
                  {score.teamA}
                </span>
              </div>

              {/* Centro */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 text-5xl font-black italic tracking-tighter">
                  <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{score.scoreA}</span>
                  <span className="text-white/20 text-3xl shrink-0">X</span>
                  <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{score.scoreB}</span>
                </div>
                {score.time && (
                  <div className="px-4 py-1 bg-vexia-purple/20 border border-vexia-purple/30 rounded-full animate-pulse">
                    <span className="text-[10px] font-black text-vexia-purple uppercase tracking-widest">
                      {score.time}
                    </span>
                  </div>
                )}
              </div>

              {/* Time B */}
              <div className="flex flex-col items-center gap-4 flex-1">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shadow-lg relative overflow-hidden">
                  {score.logoB ? (
                    <img src={score.logoB} className="w-14 h-14 object-contain" alt={score.teamB} />
                  ) : (
                    <Shield className="w-10 h-10 text-white/20" />
                  )}
                </div>
                <span className="text-sm font-black text-center uppercase tracking-tight max-w-[120px] leading-tight">
                  {score.teamB}
                </span>
              </div>
            </div>
          )}

          {/* Lista de Canais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
                Opções de Transmissão
              </h3>
              <span className="text-[10px] font-bold text-vexia-purple uppercase">
                {channels.length} {channels.length === 1 ? 'canal disponível' : 'canais disponíveis'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {channels.map(({ ch, epg }) => (
                <div 
                  key={ch.id}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-all"
                >
                  <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {ch.logo ? (
                      <img src={ch.logo} className="w-full h-full object-contain p-1" alt="" />
                    ) : (
                      <Tv className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-black uppercase tracking-tight truncate">
                      {ch.name}
                    </span>
                    {epg.now && (
                      <span className="block text-[10px] font-medium text-white/40 truncate italic mt-0.5">
                        {epg.now.title}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleWatch(ch.id)}
                      className="vexia-focus p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
                      title="Detalhes"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handlePlayer(ch.id)}
                      className="vexia-focus p-2.5 bg-vexia-purple rounded-xl shadow-lg hover:scale-105 transition-all"
                      title="Assistir"
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="bg-black/40 border-t border-white/5 p-4 text-center">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
             PipocaFlix Sports Engine v2.0
           </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Trophy } from "lucide-react";
