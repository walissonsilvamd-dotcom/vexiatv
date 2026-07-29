import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Tv } from "lucide-react";
import { AppHeader } from "../components/vexia/AppHeader";
import { BottomTabs } from "../components/vexia/BottomTabs";
import { EmptyPlaylist } from "../components/vexia/EmptyPlaylist";
import { LoadMore } from "../components/vexia/PosterGrid";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { usePlaylist } from "../lib/playlist-store";
import type { PlaylistChannel } from "../lib/m3u";

export const Route = createFileRoute("/canais")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Canais ao vivo" },
      {
        name: "description",
        content: "Canais ao vivo da sua lista M3U com filtros por categoria e favoritos.",
      },
      { property: "og:title", content: "VÉXIA TV — Canais" },
      { property: "og:description", content: "Canais ao vivo organizados por categoria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelsPage,
});

const PAGE = 60;

function ChannelsPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { channels, data, hasContent } = usePlaylist();
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState<PlaylistChannel | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [listsOpen, setListsOpen] = useState(false);

  const list = useMemo(
    () => (category === "Todos" ? channels : channels.filter((c) => c.category === category)),
    [channels, category],
  );

  useEffect(() => {
    setSelected((cur) => (cur && list.includes(cur) ? cur : (list[0] ?? null)));
  }, [list]);

  const toggleFav = (id: string) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  if (!hasContent || channels.length === 0) {
    return (
      <main className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
        <AppHeader />
        <div className="px-5 md:px-10">
          <EmptyPlaylist section="Os canais ao vivo" onOpenLists={() => setListsOpen(true)} />
        </div>
        <QrPlaylistDialog open={listsOpen} onClose={() => setListsOpen(false)} />
        <BottomTabs active="Canais" />
      </main>
    );
  }

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg pb-28 text-vexia-text">
      <AppHeader />

      <div className="grid gap-5 px-5 md:grid-cols-[220px_1fr] md:px-10">
        <aside className="space-y-2">
          <h2 className="text-sm font-black tracking-wide text-vexia-purple-soft">CATEGORIAS</h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[70vh] md:flex-col md:overflow-y-auto">
            {(data?.channelCategories ?? ["Todos"]).map((cat) => (
              <button
                key={cat}
                type="button"
                data-nav-row={1}
                tabIndex={0}
                onClick={() => {
                  setCategory(cat);
                  setLimit(PAGE);
                }}
                className={`vexia-focus shrink-0 truncate rounded-xl border px-4 py-2.5 text-left text-xs font-bold transition-all ${
                  category === cat
                    ? "border-vexia-purple/60 bg-gradient-to-r from-vexia-purple to-vexia-purple/70 text-white shadow-[0_0_18px_-4px_rgba(123,47,190,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    : "border-white/10 bg-gradient-to-br from-[#1E1E1E] to-[#141414] text-vexia-text hover:border-vexia-purple/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-vexia-purple/40 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] p-4 shadow-[0_16px_40px_-16px_rgba(123,47,190,0.6)]">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vexia-cyan/40 to-transparent" />
            <div className="grid aspect-video w-full place-items-center overflow-hidden rounded-xl border border-white/5 bg-black/70 text-xs tracking-[0.3em] text-vexia-muted">
              {selected?.logo ? (
                <img
                  src={selected.logo}
                  alt={selected.name}
                  className="max-h-[60%] max-w-[50%] object-contain drop-shadow-[0_0_18px_rgba(0,200,255,0.25)]"
                />
              ) : (
                "PRÉVIA AO VIVO"
              )}
            </div>
            <p className="mt-3 text-base font-extrabold text-vexia-text">{selected?.name}</p>
            <p className="text-xs font-medium text-vexia-cyan/80">
              {selected?.group} • {selected?.schedule}
            </p>
            <button
              type="button"
              data-nav-row={2}
              tabIndex={0}
              onClick={() => selected && toggleFav(selected.id)}
              className="vexia-focus mt-4 rounded-full border border-white/10 bg-gradient-to-b from-vexia-purple to-vexia-purple/70 px-7 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_26px_-10px_rgba(123,47,190,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:-translate-y-0.5"
            >
              {selected && favs.includes(selected.id)
                ? "REMOVER DOS FAVORITOS"
                : "ADICIONAR AOS FAVORITOS"}
            </button>
          </div>

          <ul className="grid gap-2.5 md:grid-cols-2">

            {list.slice(0, limit).map((ch) => (
              <li key={ch.id} className="relative">
                <button
                  type="button"
                  data-nav-row={3}
                  tabIndex={0}
                  onClick={() => setSelected(ch)}
                  className="vexia-focus flex w-full items-center gap-3 rounded-lg bg-vexia-card p-3 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-black text-xs font-black text-vexia-purple-soft">
                    {ch.logo ? (
                      <img src={ch.logo} alt="" loading="lazy" className="h-full w-full object-contain" />
                    ) : (
                      <Tv className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-vexia-text">
                      {ch.name}
                    </span>
                    <span className="block truncate text-[11px] text-vexia-cyan">{ch.group}</span>
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

          {limit < list.length ? (
            <LoadMore
              label="CARREGAR MAIS CANAIS"
              navRow={4}
              onClick={() => setLimit((l) => l + PAGE)}
            />
          ) : null}
        </section>
      </div>

      <BottomTabs active="Canais" />
    </main>
  );
}
