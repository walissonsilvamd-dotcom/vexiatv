import { Link } from "@tanstack/react-router";
import { useSettings } from "../../lib/settings-store";

type TabKey = "Home" | "Canais" | "Filmes" | "Séries" | "Favoritos" | "Ajustes";

const TABS: { label: TabKey; to: string; hideKey?: "hideVod" | "hideSeries" }[] = [
  { label: "Home", to: "/home" },
  { label: "Canais", to: "/canais" },
  { label: "Filmes", to: "/filmes", hideKey: "hideVod" },
  { label: "Séries", to: "/series", hideKey: "hideSeries" },
  { label: "Favoritos", to: "/favoritos" },
  { label: "Ajustes", to: "/configuracoes" },
];

/** Menu superior compartilhado por todas as páginas do app. */
export function TopNav({ active, className = "" }: { active?: TabKey; className?: string }) {
  const { settings } = useSettings();
  const tabs = TABS.filter((t) => !t.hideKey || !settings[t.hideKey]);

  return (
    <nav
      aria-label="Menu principal"
      className={`flex items-center gap-1 rounded-2xl border border-white/10 bg-black/60 p-1.5 backdrop-blur-xl ${className}`}
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
            className={`vexia-focus rounded-xl px-4 py-2 text-sm font-bold transition-all md:px-5 ${
              isActive
                ? "bg-gradient-to-b from-vexia-purple to-vexia-purple/70 text-white shadow-[0_0_20px_rgba(123,47,190,0.6)]"
                : "text-vexia-text/85 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
