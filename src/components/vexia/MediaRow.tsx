import { Star } from "lucide-react";
import type { MediaItem } from "../../data/vexia";

export function MediaCard({ item, navRow }: { item: MediaItem; navRow: number }) {
  return (
    <button
      type="button"
      data-nav-row={navRow}
      tabIndex={0}
      className="vexia-focus w-[150px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-vexia-card text-left md:w-[170px]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: item.posterPosition ?? "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-vexia-gold">
          <Star className="h-3 w-3 fill-current" aria-hidden />
          {item.rating.toFixed(1)}
        </span>
      </div>
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-sm font-semibold text-vexia-text">{item.title}</p>
        <p className="truncate text-[11px] text-vexia-muted">
          {item.year}
          {item.seasons ? ` • ${item.seasons} temporadas` : ""}
        </p>
      </div>
    </button>
  );
}

export function MediaRow({
  title,
  items,
  navRow,
}: {
  title: string;
  items: MediaItem[];
  navRow: number;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold tracking-wide text-vexia-text">
        {title}
        <span className="ml-3 inline-block h-[2px] w-16 translate-y-[-4px] rounded bg-gradient-to-r from-vexia-purple to-vexia-cyan" />
      </h3>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 py-3">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} navRow={navRow} />
        ))}
      </div>
    </section>
  );
}
