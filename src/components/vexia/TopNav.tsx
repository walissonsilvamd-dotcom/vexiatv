import { Link, useNavigate } from "@tanstack/react-router";
import { Undo2 } from "lucide-react";
import { useSettings } from "../../lib/settings-store";

type TabKey =
  | "Home"
  | "Busca"
  | "Canais"
  | "Filmes"
  | "Séries"
  | "Kids"
  | "Favoritos"
  | "Histórico"
  | "Ajustes"
  | "Jogos";

const TABS: { label: TabKey; to: string; hideKey?: "hideVod" | "hideSeries" }[] = [
  { label: "Home", to: "/home" },
  { label: "Canais", to: "/canais" },
  { label: "Filmes", to: "/filmes", hideKey: "hideVod" },
  { label: "Séries", to: "/series", hideKey: "hideSeries" },
  { label: "Kids", to: "/kids" },
  { label: "Jogos", to: "/jogos" },
  { label: "Favoritos", to: "/favoritos" },
  { label: "Histórico", to: "/historico" },
  { label: "Ajustes", to: "/configuracoes" },
];

/** Menu superior compartilhado por todas as páginas do app. */
export function TopNav({ active, className = "" }: { active?: TabKey; className?: string }) {
  const { settings } = useSettings();
  const tabs = TABS.filter((t) => !t.hideKey || !settings[t.hideKey]);

  const navigate = useNavigate();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => navigate({ to: -1 as any })}
        data-nav-row={0}
        tabIndex={0}
        aria-label="Voltar"
        className="vexia-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/5 bg-black/40 text-white/60 focus:border-vexia-purple focus:shadow-[0_0_20px_rgba(123,43,190,0.6)] hover:text-white md:h-9 md:w-9"
      >
        <Undo2 className="h-4 w-4" />
      </button>
      <nav
        aria-label="Menu principal"
        className="no-scrollbar flex min-w-0 shrink items-center gap-1 overflow-x-auto rounded-full border border-white/5 bg-black/40 p-1 backdrop-blur-2xl"
      >
      {tabs.map((tab) => {
        const isActive = tab.label === active;
        return (
          <Link
            key={tab.label}
            to={tab.to}
            data-nav-row={0}
            tabIndex={0}
            activeProps={{ "aria-current": "page" }}
            className={`vexia-focus flex shrink-0 items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all focus:border-vexia-purple focus:shadow-[0_0_20px_rgba(123,43,190,0.8)] md:px-4 md:text-[11px] ${
              isActive
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] border-transparent"
                : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      </nav>
    </div>
  );
}
