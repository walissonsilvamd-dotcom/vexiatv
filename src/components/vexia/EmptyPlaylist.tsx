import { Link } from "@tanstack/react-router";
import { ListVideo } from "lucide-react";

export function EmptyPlaylist({
  section,
  onOpenLists,
}: {
  section: string;
  onOpenLists?: () => void;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-vexia-purple/30 bg-vexia-card/60 px-6 py-14 text-center">
      <ListVideo className="h-8 w-8 text-vexia-purple-soft" aria-hidden />
      <p className="mt-3 text-sm font-black tracking-wide text-vexia-text">
        NENHUMA LISTA CARREGADA
      </p>
      <p className="mt-2 max-w-md text-xs text-vexia-muted">
        {section} aparecem aqui assim que você carregar sua lista M3U no menu LISTAS.
      </p>
      {onOpenLists ? (
        <button
          type="button"
          onClick={onOpenLists}
          className="vexia-focus mt-5 rounded-full bg-vexia-purple px-7 py-2.5 text-xs font-bold tracking-wide text-vexia-text"
        >
          CARREGAR LISTA
        </button>
      ) : (
        <Link
          to="/listas"
          className="vexia-focus mt-5 rounded-full bg-vexia-purple px-7 py-2.5 text-xs font-bold tracking-wide text-vexia-text"
        >
          IR PARA LISTAS
        </Link>
      )}
    </div>
  );
}
