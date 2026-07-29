import { useEffect, useState } from "react";
import { Play, Info, Star } from "lucide-react";
import type { MediaItem } from "../../data/vexia";

type Props = { items: MediaItem[]; navRow?: number };

export function HeroCarousel({ items, navRow = 1 }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), 10000);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[index];

  return (
    <section className="relative h-[58vh] min-h-[380px] w-full overflow-hidden rounded-2xl border border-white/10">
      {items.map((item, i) => (
        <img
          key={item.id}
          src={item.backdrop}
          alt={item.title}
          width={1920}
          height={1080}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
            i === index ? "scale-105 opacity-100" : "opacity-0"
          }`}
          style={{ transition: "opacity 1400ms ease-in-out, transform 10s linear" }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-vexia-bg via-vexia-bg/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-vexia-bg via-transparent to-vexia-bg/40" />

      <div className="relative flex h-full max-w-2xl flex-col justify-end gap-3 p-8 md:p-12">
        <h2 className="text-4xl font-black tracking-tight text-vexia-text drop-shadow-lg md:text-5xl">
          {current.title}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-vexia-muted">
          <span className="flex items-center gap-1 font-semibold text-vexia-gold">
            <Star className="h-4 w-4 fill-current" aria-hidden />
            {current.rating.toFixed(1)}
          </span>
          <span>{current.year}</span>
          {current.runtime ? <span>{current.runtime}</span> : null}
          <span className="text-vexia-cyan">{current.genres.join(" • ")}</span>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-vexia-muted md:text-base">
          {current.overview}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            data-nav-row={navRow}
            tabIndex={0}
            className="vexia-focus flex items-center gap-2 rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan px-6 py-3 text-sm font-bold text-vexia-text"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden /> ASSISTIR
          </button>
          <button
            type="button"
            data-nav-row={navRow}
            tabIndex={0}
            className="vexia-focus flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-vexia-text backdrop-blur-sm"
          >
            <Info className="h-4 w-4" aria-hidden /> DETALHES
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 right-8 flex gap-2">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Ir para ${item.title}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-vexia-cyan" : "w-3 bg-white/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
