import { createFileRoute } from "@tanstack/react-router";
import ogImage from "../assets/splash-vexia.jpg.asset.json";
import { History, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import { TopNav } from "../components/vexia/TopNav";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import {
  useOpenWatch,
  useResolvedHistory,
  WatchCard,
  type ResolvedWatch,
} from "../components/vexia/WatchCard";
import { ConfirmDialog } from "../components/vexia/ConfirmDialog";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { clearCompleted, useWatchHistory, type WatchKind } from "../lib/history-store";
import { clearProgress } from "../lib/progress-store";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Histórico" },
      {
        name: "description",
        content:
          "Histórico de reprodução do VÉXIA TV: continue filmes, séries e canais exatamente de onde parou.",
      },
      { property: "og:title", content: "VÉXIA TV — Histórico" },
      {
        property: "og:description",
        content: "Tudo o que você assistiu, com progresso salvo no aparelho.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vexiatv.lovable.app/historico" },
      { property: "og:image", content: ogImage.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage.url },
    ],
    links: [{ rel: "canonical", href: "https://vexiatv.lovable.app/historico" }],
  }),
  component: HistoryPage,
});

const FILTERS: { label: string; kind: WatchKind | "all" }[] = [
  { label: "Todos", kind: "all" },
  { label: "Filmes", kind: "movie" },
  { label: "Séries", kind: "series" },
  { label: "Canais", kind: "channel" },
];

function HistoryPage() {
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const { history, remove, clear } = useWatchHistory();
  const resolved = useResolvedHistory(history);
  const open = useOpenWatch();

  const [filter, setFilter] = useState<WatchKind | "all">("all");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ResolvedWatch | null>(null);

  const confirmRemove = () => {
    const entry = pendingRemove;
    if (!entry) return;
    remove(entry.key);
    clearProgress(entry.liveId ?? entry.id);
    if (entry.episodeId) clearProgress(`${entry.liveId ?? entry.id}::${entry.episodeId}`);
    setPendingRemove(null);
  };

  const counts = useMemo(
    () => ({
      all: resolved.length,
      movie: resolved.filter((e) => e.kind === "movie").length,
      series: resolved.filter((e) => e.kind === "series").length,
      channel: resolved.filter((e) => e.kind === "channel").length,
    }),
    [resolved],
  );

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resolved.filter(
      (e) =>
        (filter === "all" || e.kind === filter) &&
        (!q || e.name.toLowerCase().includes(q) || (e.category ?? "").toLowerCase().includes(q)),
    );
  }, [resolved, filter, query]);

  return (
    <main
      ref={scopeRef}
      className="vexia-safe relative min-h-screen bg-vexia-bg pb-24 text-vexia-text"
      style={{
        backgroundImage: `linear-gradient(rgba(5,5,5,0.88), rgba(5,5,5,0.95)), url(${nebula.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="flex items-center gap-4 px-6 py-4 md:px-10">
        <TopNav active="Histórico" />
        <label className="relative max-w-xl flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-vexia-text/50"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-nav-row={0}
            tabIndex={0}
            placeholder="Buscar no histórico"
            aria-label="Buscar no histórico"
            className="vexia-focus w-full rounded-full border border-white/10 bg-black/60 py-2.5 pl-11 pr-4 text-sm text-vexia-text outline-none backdrop-blur-xl placeholder:text-vexia-text/45"
          />
        </label>
        <div className="ml-auto hidden md:block">
          <VexiaLogo className="h-11" />
        </div>
      </header>

      <h1 className="flex items-center gap-3 px-6 text-2xl font-black tracking-wide text-vexia-purple-soft drop-shadow-[0_0_18px_rgb(var(--vexia-primary-rgb)/0.6)] md:px-10 md:text-3xl">
        <History className="h-7 w-7" aria-hidden /> HISTÓRICO
      </h1>

      <div className="mt-4 flex flex-col gap-6 px-6 md:flex-row md:px-10">
        <aside className="w-full shrink-0 md:w-56">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-vexia-text/50">
            Categorias
          </p>
          <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {FILTERS.map((f) => {
              const isActive = filter === f.kind;
              return (
                <button
                  key={f.kind}
                  type="button"
                  data-nav-row={1}
                  tabIndex={0}
                  onClick={() => setFilter(f.kind)}
                  className={`vexia-focus flex shrink-0 items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                    isActive
                      ? "bg-vexia-purple text-white shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.55)]"
                      : "bg-[#1A1A1A] text-vexia-text hover:bg-white/10"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={isActive ? "text-white/80" : "text-vexia-cyan"}>
                    {counts[f.kind]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              data-nav-row={1}
              tabIndex={0}
              onClick={() => setConfirm(true)}
              className="vexia-focus flex w-full items-center justify-center gap-2 rounded-lg bg-vexia-purple px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgb(var(--vexia-primary-rgb)/0.5)]"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Limpar histórico
            </button>
            <button
              type="button"
              data-nav-row={1}
              tabIndex={0}
              onClick={() => clearCompleted()}
              className="vexia-focus w-full rounded-lg border border-white/15 bg-[#1A1A1A] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-vexia-text hover:bg-white/10"
            >
              Limpar itens assistidos
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          {list.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-white/10 bg-black/50 px-6 py-20 text-center backdrop-blur-xl">
              <History className="mb-3 h-10 w-10 text-vexia-purple" aria-hidden />
              <p className="text-lg font-black">Nada por aqui ainda</p>
              <p className="mt-1 max-w-sm text-sm text-vexia-text/60">
                Ao assistir filmes, séries ou canais, o VÉXIA TV guarda o progresso aqui para você
                continuar de onde parou.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7">
              {list.map((entry) => (
                <WatchCard
                  key={entry.key}
                  entry={entry}
                  navRow={2}
                  onOpen={() => open(entry)}
                  onRemove={() => setPendingRemove(entry)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-vexia-purple/40 bg-[#0b0b0f] p-6 text-center">
            <p className="text-base font-black">Tem certeza?</p>
            <p className="mt-2 text-sm text-vexia-text/70">
              Isso apaga todo o histórico e o "Continuar assistindo".
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="vexia-focus rounded-full border border-white/20 px-5 py-2 text-xs font-bold"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setConfirm(false);
                }}
                className="vexia-focus rounded-full bg-vexia-purple px-5 py-2 text-xs font-black text-white"
              >
                LIMPAR
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remover do histórico?"
        message={
          pendingRemove
            ? `"${pendingRemove.name}" sairá do histórico e o progresso salvo será apagado.`
            : undefined
        }
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </main>
  );
}
