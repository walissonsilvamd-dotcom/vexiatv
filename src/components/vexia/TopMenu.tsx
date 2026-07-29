import { Link } from "@tanstack/react-router";
import {
  Tv,
  Film,
  MonitorPlay,
  ListVideo,
  Settings,
  RefreshCw,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export type MenuAction = "reload" | "exit";

type Item = {
  label: string;
  icon: LucideIcon;
  to?: string;
  action?: MenuAction;
};

export const MENU_ITEMS: Item[] = [
  { label: "TV AO VIVO", icon: Tv, to: "/tv-ao-vivo" },
  { label: "FILMES", icon: Film, to: "/filmes" },
  { label: "SÉRIES", icon: MonitorPlay, to: "/series" },
  { label: "TROCAR PLAYLIST", icon: ListVideo, to: "/playlist" },
  { label: "CONFIGURAÇÕES", icon: Settings, to: "/configuracoes" },
  { label: "RECARREGAR", icon: RefreshCw, action: "reload" },
  { label: "SAIR", icon: LogOut, action: "exit" },
];

type Props = {
  active?: string;
  onAction?: (action: MenuAction) => void;
  navRow?: number;
};

const base =
  "vexia-focus group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-vexia-text backdrop-blur-sm";

export function TopMenu({ active, onAction, navRow = 0 }: Props) {
  return (
    <nav aria-label="Menu principal" className="flex flex-wrap items-center gap-2">
      {MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.label;
        const cls = `${base} ${
          isActive
            ? "border-vexia-purple-soft/70 bg-vexia-purple/30 shadow-[0_0_24px_-4px_var(--vexia-purple)]"
            : ""
        }`;
        const content = (
          <>
            <Icon className="h-4 w-4 text-vexia-cyan" aria-hidden />
            <span>{item.label}</span>
          </>
        );

        if (item.to) {
          return (
            <Link key={item.label} to={item.to} data-nav-row={navRow} tabIndex={0} className={cls}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={item.label}
            type="button"
            data-nav-row={navRow}
            tabIndex={0}
            onClick={() => onAction?.(item.action!)}
            className={cls}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
