import { Link } from "@tanstack/react-router";
import { Home, Tv, Film, MonitorPlay, Settings, type LucideIcon } from "lucide-react";
import { SLOGAN } from "../../data/vexia-catalog";
import { useSettings } from "../../lib/settings-store";

const TABS: { label: string; icon: LucideIcon; to: string; hideKey?: "hideVod" | "hideSeries" }[] = [
  { label: "Home", icon: Home, to: "/home" },
  { label: "Canais", icon: Tv, to: "/canais" },
  { label: "Filmes", icon: Film, to: "/filmes", hideKey: "hideVod" },
  { label: "Séries", icon: MonitorPlay, to: "/series", hideKey: "hideSeries" },
  { label: "Ajustes", icon: Settings, to: "/configuracoes" },
];

export function BottomTabs({ active, navRow = 90 }: { active: string; navRow?: number }) {
  const { settings } = useSettings();
  const tabs = TABS.filter((t) => !t.hideKey || !settings[t.hideKey]);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-[1600px] items-stretch justify-around px-2">

        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.label;
          return (
            <li key={tab.label} className="flex-1">
              <Link
                to={tab.to}
                data-nav-row={navRow}
                tabIndex={0}
                className={`vexia-focus flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-semibold tracking-wide ${
                  isActive ? "text-vexia-purple-soft" : "text-vexia-cyan"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-vexia-purple-soft" : "text-vexia-cyan"}`}
                  aria-hidden
                />
                {tab.label}
                <span
                  className={`h-[2px] w-6 rounded ${isActive ? "bg-vexia-purple" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="pb-1 text-center text-[9px] tracking-[0.25em] text-vexia-cyan/70">{SLOGAN}</p>
    </nav>
  );
}
