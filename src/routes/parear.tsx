import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { checkPairSession, submitPairPlaylist } from "../lib/pair.functions";

export const Route = createFileRoute("/parear")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Enviar lista para a TV" },
      {
        name: "description",
        content:
          "Cole o link da sua lista M3U ou HLS no celular e envie direto para a sua Smart TV com o VÉXIA TV.",
      },
      { property: "og:title", content: "VÉXIA TV — Enviar lista para a TV" },
      {
        property: "og:description",
        content: "Pareamento por QR Code: envie sua lista IPTV do celular para a TV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : undefined,
  }),
  component: PairPage,
});

function PairPage() {
  const { c } = Route.useSearch();
  const check = useServerFn(checkPairSession);
  const submit = useServerFn(submitPairPlaylist);

  const [code, setCode] = useState((c ?? "").toUpperCase());
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "expired">("checking");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"link" | "acesso">("link");
  const [server, setServer] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setState("invalid");
      return;
    }
    let alive = true;
    void check({ data: { code } })
      .then((r) => {
        if (!alive) return;
        if (r.status === "missing") setState("invalid");
        else if (r.status === "expired") setState("expired");
        else setState("ready");
      })
      .catch(() => alive && setState("invalid"));
    return () => {
      alive = false;
    };
  }, [code, check]);

  const send = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      setError("O link precisa começar com http:// ou https://");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const r = await submit({ data: { code, name: name.trim() || undefined, url: url.trim() } });
      if (r.ok) setSent(true);
      else setError("Esse código expirou. Gere um novo QR Code na TV.");
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-vexia-bg px-5 py-8 text-vexia-text">
      <VexiaLogo className="h-20" />
      <h1 className="mt-5 text-center text-xl font-black tracking-[0.12em]">ENVIAR LISTA PARA A TV</h1>

      <div className="mt-6 w-full max-w-md rounded-2xl border border-vexia-purple/50 bg-vexia-card/85 p-5 shadow-[0_0_50px_-20px_var(--vexia-purple)]">
        {state === "checking" ? (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verificando código...
          </p>
        ) : state !== "ready" ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-white/80">
              {state === "expired"
                ? "Este código de pareamento expirou."
                : "Código de pareamento inválido."}
            </p>
            <p className="text-xs text-white/60">
              Abra o menu LISTAS na TV, gere um novo QR Code e leia de novo.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Digite o código exibido na TV"
              aria-label="Código de pareamento"
              className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-center tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-white/45 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setState("checking")}
              className="w-full rounded-full bg-vexia-purple px-5 py-3 text-sm font-bold tracking-[0.14em]"
            >
              CONTINUAR
            </button>
          </div>
        ) : sent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-vexia-purple">
              <Check className="h-7 w-7 text-white" aria-hidden />
            </span>
            <p className="text-base font-bold">Lista enviada!</p>
            <p className="text-xs text-white/70">
              A TV já está carregando sua lista. Pode fechar esta página.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-xs text-white/70">
              Código <span className="font-bold tracking-[0.3em] text-vexia-cyan">{code}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-full border border-vexia-purple/40 bg-black/50 p-1">
              {(["link", "acesso"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-2 text-[11px] font-bold tracking-[0.12em] ${
                    mode === m ? "bg-vexia-purple text-white" : "text-white/70"
                  }`}
                >
                  {m === "link" ? "LINK M3U/HLS" : "CÓDIGO + LOGIN"}
                </button>
              ))}
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da lista (opcional)"
              aria-label="Nome da lista"
              className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
            />

            {mode === "link" ? (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Cole o link M3U ou HLS aqui"
                aria-label="Link da lista M3U ou HLS"
                className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
              />
            ) : (
              <>
                <input
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="CÓDIGO (ex: meuservidor.com:8080)"
                  aria-label="Código do servidor"
                  className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                />
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="LOGIN"
                  aria-label="Login"
                  className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                />
                <input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type="password"
                  placeholder="SENHA"
                  aria-label="Senha"
                  className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-5 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                />
              </>
            )}
            {error ? <p className="text-center text-xs text-red-400">{error}</p> : null}
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-vexia-purple px-5 py-3 text-sm font-bold tracking-[0.14em] disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              ENVIAR PARA A TV
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-white/50">
        O link fica disponível apenas para a TV que gerou este código.
      </p>
    </main>
  );
}
