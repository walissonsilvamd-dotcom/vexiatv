import { Link } from "@tanstack/react-router";
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

  return (
    <nav
      aria-label="Menu principal"
      className={`no-scrollbar flex min-w-0 shrink items-center gap-1 overflow-x-auto rounded-full border border-white/5 bg-black/40 p-1 backdrop-blur-2xl ${className}`}
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
            className={`vexia-focus flex shrink-0 items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all md:px-4 md:text-[11px] ${
              isActive
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
