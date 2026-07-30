import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Clapperboard, Library, RotateCcw, Tv } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import nebula from "../assets/nebula-bg.jpg.asset.json";
import {
  PLAYLIST_STAGES,
  usePlaylist,
  type PlaylistCounts,
} from "../lib/playlist-store";

type LoadingSearch = { url: string; name?: string };

export const Route = createFileRoute("/carregando")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): LoadingSearch => ({
    url: String(search.url ?? ""),
    name: search.name ? String(search.name) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Carregando sua lista" },
      {
        name: "description",
        content:
          "O VÉXIA TV está conectando ao servidor, criando categorias e organizando canais, filmes e séries da sua lista.",
      },
      { property: "og:title", content: "VÉXIA TV — Carregando sua lista" },
      {
        property: "og:description",
        content: "Preparando sua biblioteca de canais, filmes e séries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarregandoPage,
});

type Phase = "loading" | "success" | "error";

function CarregandoPage() {
  const { url, name } = Route.useSearch();
  const navigate = useNavigate();
  const { loadFromUrl, loadFromText, error: playlistError } = usePlaylist();
  const errorRef = useRef<string | null>(null);
  errorRef.current = playlistError;

  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [counts, setCounts] = useState<PlaylistCounts>({ channels: 0, movies: 0, series: 0 });
  const [attempt, setAttempt] = useState(0);
  const [stageRatio, setStageRatio] = useState(0);
  const [tryCount, setTryCount] = useState<{ n: number; total: number } | null>(null);
  const running = useRef(false);

  const start = useCallback(async () => {
    if (running.current) return;
    if (!url) {
      setPhase("error");
      setErrorMsg("Nenhum link de lista foi informado.");
      return;
    }
    running.current = true;
    setPhase("loading");
    setErrorMsg(null);
    setStage(0);
    setCounts({ channels: 0, movies: 0, series: 0 });
    setStageRatio(0);
    setTryCount(null);

    // Link HLS único (.m3u8): não é uma lista — vira um canal ao vivo.
    let ok: boolean;
    if (isDirectHls(url)) {
      setStage(PLAYLIST_STAGES.length - 1);
      setStageRatio(1);
      ok = await loadFromText(singleChannelPlaylist(url, name), name || "Canal ao vivo");
      if (ok) setCounts({ channels: 1, movies: 0, series: 0 });
    } else {
      ok = await loadFromUrl(url, name, (event) => {
        setStage(event.stage);
        if (event.ratio != null) setStageRatio(event.ratio);
        if (event.attempt) setTryCount({ n: event.attempt, total: event.attempts ?? 3 });
        if (event.counts) setCounts((c) => ({ ...c, ...event.counts }));
      });
    }
    running.current = false;

    if (ok) {
      setStage(PLAYLIST_STAGES.length);
      setPhase("success");
      window.setTimeout(() => void navigate({ to: "/home" }), 600);
    } else {
      setPhase("error");
      setErrorMsg(errorRef.current || "Não foi possível carregar sua lista.");
    }
  }, [url, name, loadFromUrl, loadFromText, navigate]);

  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const goBack = useCallback(() => void navigate({ to: "/listas" }), [navigate]);

  /* ── Android TV: bloqueia interações durante o carregamento ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "loading") {
        e.preventDefault();
        return;
      }
      if (phase === "success" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        void navigate({ to: "/home" });
      }
      if (phase === "error" && (e.key === "Backspace" || e.key === "Escape")) {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, navigate, goBack]);

  const total = PLAYLIST_STAGES.length;
  // Progresso real: etapa concluída + fração medida da etapa atual.
  const progress =
    phase === "success"
      ? 100
      : Math.min(99, Math.round(((stage + Math.min(1, stageRatio)) / total) * 100));

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-vexia-bg font-sans text-white">
      <img
        src={nebula.url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black/95" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-10">
        {/* Logo + anel de energia */}
        <div className="relative grid h-40 w-40 place-items-center">
          <span className="vexia-loader-ring absolute inset-0 rounded-full" aria-hidden />
          <span className="vexia-loader-ring-2 absolute inset-3 rounded-full" aria-hidden />
          <span className="vexia-loader-pulse absolute inset-6 rounded-full" aria-hidden />
          <VexiaLogo className="vexia-loader-logo relative h-20" />
        </div>

        {phase === "error" ? (
          <ErrorPanel
            message={errorMsg}
            onRetry={() => setAttempt((a) => a + 1)}
            onBack={goBack}
          />
        ) : (
          <>
            <h1 className="mt-7 text-center text-2xl font-black tracking-[0.06em] text-white">
              {phase === "success" ? "Lista carregada com sucesso!" : "Carregando sua lista..."}
            </h1>
            <p className="mt-1.5 text-center text-sm font-medium text-vexia-cyan">
              {phase === "success"
                ? "Preparando sua experiência VÉXIA..."
                : `${PLAYLIST_STAGES[stage] ?? PLAYLIST_STAGES[0]}... ${progress}%${
                    tryCount && tryCount.n > 1
                      ? ` • Tentando conectar (tentativa ${tryCount.n}/${tryCount.total})`
                      : ""
                  }`}
            </p>

            {/* Barra de progresso */}
            <div className="mt-7 flex w-full max-w-md items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-vexia-popup ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vexia-purple to-vexia-cyan shadow-[0_0_18px_-2px_var(--vexia-purple)] transition-[width] duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso do carregamento da lista"
                />
              </div>
              <span className="w-12 text-right text-sm font-bold text-white">{progress}%</span>
            </div>

            {/* Etapas */}
            <ul className="mt-8 w-full max-w-md space-y-2">
              {PLAYLIST_STAGES.map((label, i) => {
                const done = phase === "success" || i < stage;
                const active = phase !== "success" && i === stage;
                return (
                  <li
                    key={label}
                    className={`flex items-center gap-3 text-sm ${
                      done
                        ? "text-[#00C853]"
                        : active
                          ? "font-medium text-vexia-purple-soft"
                          : "text-vexia-muted"
                    }`}
                  >
                    <span className="grid h-5 w-5 place-items-center">
                      {done ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : active ? (
                        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-vexia-purple" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full border border-vexia-muted/70" />
                      )}
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>

            {/* Contadores dinâmicos */}
            <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
              <Counter icon={<Tv className="h-4 w-4" aria-hidden />} label="Canais" value={counts.channels} />
              <Counter icon={<Clapperboard className="h-4 w-4" aria-hidden />} label="Filmes" value={counts.movies} />
              <Counter icon={<Library className="h-4 w-4" aria-hidden />} label="Séries" value={counts.series} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Counter({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-vexia-popup/70 px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-vexia-cyan">{icon}</div>
      <p className="mt-1 text-lg font-bold text-vexia-cyan">{value.toLocaleString("pt-BR")}</p>
      <p className="text-[11px] text-vexia-muted">{label}</p>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
  onBack,
}: {
  message: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-[#FF1744]/40 bg-vexia-popup/90 p-6 text-center">
      <p className="text-lg font-black text-white">
        {message ?? "Não foi possível carregar sua lista."}
      </p>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-vexia-muted">
        Verifique
      </p>
      <ul className="mt-2 space-y-1 text-sm text-vexia-muted">
        <li>• Link informado</li>
        <li>• Conexão com internet</li>
        <li>• Disponibilidade do servidor</li>
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          autoFocus
          onClick={onRetry}
          className="vexia-focus flex items-center gap-2 rounded-full bg-vexia-purple px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_0_30px_-8px_var(--vexia-purple)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Tentar novamente
        </button>
        <button
          type="button"
          onClick={onBack}
          className="vexia-focus flex items-center gap-2 rounded-full border border-vexia-cyan/60 px-6 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-vexia-cyan"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </button>
      </div>
    </div>
  );
}
