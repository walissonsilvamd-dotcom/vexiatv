import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { LoadMore } from "../components/vexia/PosterGrid";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { channelCategories, fullChannels } from "../data/vexia-catalog";

export const Route = createFileRoute("/canais")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Canais ao vivo" },
      {
        name: "description",
        content: "Lista de canais ao vivo do VÉXIA TV com filtros por categoria e favoritos.",
      },
      { property: "og:title", content: "VÉXIA TV — Canais" },
      { property: "og:description", content: "Canais ao vivo organizados por categoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelsPage,
});

function ChannelsPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState(fullChannels[0]);
  const [favs, setFavs] = useState<string[]>([]);

  const list =
    category === "Todos" ? fullChannels : fullChannels.filter((c) => c.category === category);

  const toggleFav = (id: string) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader />

      <div className="grid gap-5 px-5 md:grid-cols-[220px_1fr] md:px-10">
        <aside className="space-y-2">
          <h2 className="text-sm font-black tracking-wide text-vexia-purple-soft">FILTROS</h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {channelCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                data-nav-row={1}
                tabIndex={0}
                onClick={() => setCategory(cat)}
                className={`vexia-focus shrink-0 rounded-lg px-4 py-2 text-left text-xs font-semibold ${
                  category === cat ? "bg-vexia-purple text-vexia-text" : "bg-vexia-card text-vexia-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border-2 border-vexia-purple bg-black p-4">
            <div className="grid aspect-video w-full place-items-center rounded-lg bg-black/60 text-xs tracking-[0.3em] text-vexia-muted">
              PRÉVIA AO VIVO
            </div>
            <p className="mt-3 text-base font-bold text-vexia-text">{selected.name}</p>
            <p className="text-xs text-vexia-cyan">
              {selected.group} • {selected.category} • {selected.schedule}
            </p>
            <button
              type="button"
              data-nav-row={2}
              tabIndex={0}
              onClick={() => toggleFav(selected.id)}
              className="vexia-focus mt-4 rounded-full bg-vexia-purple px-6 py-2 text-[11px] font-bold tracking-wide"
            >
              {favs.includes(selected.id) ? "REMOVER DOS FAVORITOS" : "ADICIONAR AOS FAVORITOS"}
            </button>
          </div>

          <ul className="grid gap-2 md:grid-cols-2">
            {list.map((ch) => (
              <li key={ch.id} className="relative">
                <button
                  type="button"
                  data-nav-row={3}
                  tabIndex={0}
                  onClick={() => setSelected(ch)}
                  className="vexia-focus flex w-full items-center gap-3 rounded-lg bg-vexia-card p-3 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-black text-xs font-black text-vexia-purple-soft">
                    {ch.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-vexia-text">
                      {ch.name}
                    </span>
                    <span className="block truncate text-[11px] text-vexia-cyan">
                      {ch.group} • {ch.now}
                    </span>
                  </span>
                  <span className="w-8" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleFav(ch.id)}
                  aria-label="Favoritar canal"
                  className={`absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full ${
                    favs.includes(ch.id) ? "bg-vexia-purple" : "border border-vexia-cyan/60"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${favs.includes(ch.id) ? "fill-current text-vexia-text" : "text-vexia-cyan"}`}
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>

          <LoadMore label="CARREGAR MAIS CANAIS" navRow={4} />
        </section>
      </div>

      <BottomTabs active="Canais" />
    </main>
  );
}
