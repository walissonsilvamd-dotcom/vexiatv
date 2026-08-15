import { Link } from "@tanstack/react-router";
import { useSettings } from "../../lib/settings-store";

type TabKey =
  | "Home"
  | "Busca"
  | "Canais"
  | "Filmes"
  | "Séries"
  | "Favoritos"
  | "Histórico"
  | "Ajustes";

const TABS: { label: TabKey; to: string; hideKey?: "hideVod" | "hideSeries" }[] = [
  { label: "Home", to: "/home" },
  { label: "Busca", to: "/busca" },
  { label: "Canais", to: "/canais" },
  { label: "Filmes", to: "/filmes", hideKey: "hideVod" },
  { label: "Séries", to: "/series", hideKey: "hideSeries" },
  { label: "Favoritos", to: "/favoritos" },
  { label: "Histórico", to: "/historico" },
  { label: "Jogos", to: "/jogos" },
  { label: "Ajustes", to: "/configuracoes" },
];

/** Menu superior compartilhado por todas as páginas do app. */
export function TopNav({ active, className = "" }: { active?: TabKey; className?: string }) {
  const { settings } = useSettings();
  const tabs = TABS.filter((t) => !t.hideKey || !settings[t.hideKey]);

  return (
    <nav
      aria-label="Menu principal"
      className={`no-scrollbar flex min-w-0 shrink items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-1 backdrop-blur-xl ${className}`}
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
            className={`vexia-focus flex shrink-0 items-center rounded-xl px-3 py-2.5 text-[13px] md:py-1.5 font-bold transition-all md:px-3.5 md:text-sm ${
              isActive
                ? "bg-vexia-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.4)] border-b-2 border-vexia-gold"
                : "text-white/80 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
