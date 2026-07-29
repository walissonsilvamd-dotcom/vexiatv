import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "../../data/vexia";

export function PosterCard({
  item,
  navRow,
  progress,
}: {
  item: MediaItem;
  navRow: number;
  progress?: number;
}) {
  const [fav, setFav] = useState(false);

  return (
    <div className="relative">
      <Link
        to="/detalhes/$id"
        params={{ id: item.id }}
        data-nav-row={navRow}
        tabIndex={0}
        className="vexia-focus block overflow-hidden rounded-lg border border-white/10 bg-vexia-card"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
            style={{ objectPosition: item.posterPosition ?? "center" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-bold text-vexia-gold">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            {item.rating.toFixed(1)}
          </span>
          {progress != null ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div className="h-full bg-vexia-purple" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
        <div className="space-y-0.5 p-2">
          <p className="truncate text-xs font-bold text-vexia-text">{item.title}</p>
          <p className="truncate text-[11px] text-vexia-cyan">
            {item.year}
            {item.seasons ? ` • ${item.seasons} temporadas` : ""}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setFav((f) => !f)}
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70"
      >
        <Heart
          className={`h-3.5 w-3.5 ${fav ? "fill-current text-vexia-purple-soft" : "text-vexia-cyan"}`}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function PosterGrid({
  items,
  navRow,
  progressMap,
}: {
  items: MediaItem[];
  navRow: number;
  progressMap?: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6 lg:grid-cols-8">
      {items.map((item) => (
        <PosterCard
          key={item.id}
          item={item}
          navRow={navRow}
          progress={progressMap?.[item.id]}
        />
      ))}
    </div>
  );
}

export function LoadMore({ label, navRow }: { label: string; navRow: number }) {
  return (
    <div className="flex justify-center py-6">
      <button
        type="button"
        data-nav-row={navRow}
        tabIndex={0}
        className="vexia-focus rounded-full bg-vexia-purple px-8 py-2.5 text-xs font-bold tracking-wide text-vexia-text"
      >
        {label}
      </button>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black tracking-wide text-vexia-purple-soft md:text-xl">
      {children}
    </h2>
  );
}
