import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import nebulaAsset from "../assets/nebula-bg.jpg.asset.json";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { DEVICE_KEY, DEVICE_MAC } from "../data/vexia-catalog";
import { usePlaylist } from "../lib/playlist-store";
import {
  buildXtreamUrl,
  isLikelyPlaylistUrl,
  parsePastedAccess,
} from "../lib/playlist-input";
import { QrPlaylistDialog } from "../components/vexia/QrPlaylistDialog";
import { daysUntilExpiry, formatExpiry } from "../lib/xtream";


import { TopNav } from "../components/vexia/TopNav";

export const Route = createFileRoute("/listas")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Listas" },
      {
        name: "description",
        content: "Gerencie suas listas M3U no VÉXIA TV: adicione, atualize e edite suas fontes de canais, filmes e séries.",
      },
      { property: "og:title", content: "VÉXIA TV — Listas" },
      { property: "og:description", content: "Gerencie suas fontes de conteúdo IPTV no VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListsPage,
});

function ListsPage() {
  const navigate = useNavigate();
  const { ready, source, data, loading, error, loadFromUrl, reload, clear, account, expired } =
    usePlaylist();

  // Sem lista salva, a tela de QR Code + acesso abre direto (é o que o usuário
  // precisa fazer primeiro). Com lista salva, mostra o gerenciador — por isso
  // só decidimos depois que o armazenamento local terminou de ser lido.
  const [form, setForm] = useState(false);
  useEffect(() => {
    if (ready && !source) setForm(true);
  }, [ready, source]);

  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [server, setServer] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [qrDialog, setQrDialog] = useState(false);

  const qrValue = url.trim() || source?.url || `https://vexia.tv/pair?mac=${DEVICE_MAC}&key=${DEVICE_KEY}`;

  const openForm = () => {
    setName(source?.name ?? "");
    setUrl(source?.url ?? "");
    setFormError(null);
    setDone(false);
    setForm(true);
  };

  /** Cola inteligente: aceita URL completa, host|user|senha, user:senha etc. */
  const applyPaste = (raw: string, field: "server" | "user" | "pass" | "url") => {
    const parsed = parsePastedAccess(raw);
    const rich =
      parsed.url !== undefined || parsed.server !== undefined || parsed.username !== undefined;
    if (!rich) return false;
    // Colou só um texto simples no próprio campo: deixa o comportamento normal.
    if (field === "pass" && !parsed.url && !parsed.server && !parsed.username) return false;
    if (parsed.url) setUrl(parsed.url);
    if (parsed.server) setServer(parsed.server);
    if (parsed.username) setUser(parsed.username);
    if (parsed.password !== undefined) setPass(parsed.password);
    setFormError(null);
    return true;
  };

  const buildUrl = () => {
    const typed = url.trim();
    if (typed) return typed;
    return buildXtreamUrl(server, user, pass);
  };

  const submit = () => {
    const finalUrl = buildUrl();
    if (!finalUrl) {
      setFormError(
        "Informe usuário, senha e servidor — ou cole o link M3U/HLS no campo de URL.",
      );
      return;
    }
    if (!isLikelyPlaylistUrl(finalUrl)) {
      setFormError("O link precisa começar com http:// ou https://");
      return;
    }
    setFormError(null);
    setForm(false);
    void navigate({
      to: "/carregando",
      search: { url: finalUrl, name: name.trim() || undefined },
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-vexia-bg text-vexia-text">
      <img
        src={nebulaAsset.url}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/85" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-[4vw] py-6">
        <TopNav className="w-fit" />

        {/* Cabeçalho */}
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            aria-label="Voltar"
            className="vexia-focus grid h-11 w-11 shrink-0 place-items-center rounded-full border border-vexia-purple/50 bg-black/50"
          >
            <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-2xl font-black tracking-[0.18em] md:text-3xl">LISTAS</h1>
            <p className="mt-1 truncate text-xs text-white/70 md:text-sm">
              Gerencie suas fontes de conteúdo
            </p>
          </div>
          <VexiaLogo className="h-10 shrink-0 md:h-14" />
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {/* Card adicionar */}
            <section className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={openForm}
                className="vexia-focus group flex flex-col items-center justify-center gap-3 rounded-2xl border border-vexia-purple/40 bg-vexia-card/80 px-6 py-10 text-center shadow-[0_0_40px_-18px_var(--vexia-purple)] backdrop-blur-sm"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-vexia-purple/90">
                  <Plus className="h-8 w-8 text-white" aria-hidden />
                </span>
                <span className="text-sm font-black tracking-[0.14em]">ADICIONAR LISTA</span>
                <span className="max-w-xs text-xs text-white/70">
                  Carregue sua lista M3U para acessar canais, filmes e séries
                </span>
                <span className="mt-2 rounded-full bg-vexia-purple px-7 py-2 text-xs font-bold tracking-[0.16em]">
                  ADICIONAR
                </span>
              </button>

              {/* Lista salva */}
              {source ? (
                <article className="flex flex-col justify-between rounded-2xl border border-vexia-purple/60 bg-vexia-card/85 p-5 shadow-[0_0_40px_-16px_var(--vexia-purple)] backdrop-blur-sm">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.24em] text-white/60">
                      MINHAS LISTAS
                    </p>
                    <h2 className="mt-1 truncate text-base font-black">{source.name}</h2>
                    <div className="mt-3 h-2 w-full rounded-full bg-black/60">
                      <div
                        className={`relative h-2 rounded-full ${
                          expired
                            ? "w-full bg-gradient-to-r from-red-700 to-red-500"
                            : "w-full bg-gradient-to-r from-vexia-purple to-vexia-purple-soft"
                        }`}
                      >
                        <span className="absolute -right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-vexia-cyan" />
                      </div>
                    </div>
                    <p
                      className={`mt-2 text-center text-xs font-bold ${
                        expired ? "text-red-400" : "text-vexia-cyan"
                      }`}
                    >
                      {expired ? "Assinatura vencida" : "Conectada"}
                    </p>
                    {account ? (
                      <p className="mt-1 text-center text-[10px] tracking-[0.1em] text-white/60">
                        {expired ? "Venceu em" : "Válida até"} {formatExpiry(account)}
                        {!expired && daysUntilExpiry(account) !== null
                          ? ` • ${daysUntilExpiry(account)} dia(s)`
                          : ""}
                      </p>
                    ) : null}


                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        ["CANAIS", data?.channels.length ?? 0],
                        ["FILMES", data?.movies.length ?? 0],
                        ["SÉRIES", data?.series.length ?? 0],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-black/50 py-2">
                          <dt className="text-[9px] tracking-[0.16em] text-white/60">{label}</dt>
                          <dd className="text-sm font-black text-vexia-gold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void reload()}
                      disabled={loading}
                      className="vexia-focus flex flex-1 items-center justify-center gap-2 rounded-full bg-vexia-purple px-4 py-2 text-[11px] font-bold tracking-[0.14em] disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      )}
                      ATUALIZAR
                    </button>
                    <button
                      type="button"
                      onClick={openForm}
                      className="vexia-focus flex flex-1 items-center justify-center gap-2 rounded-full border border-vexia-cyan/50 px-4 py-2 text-[11px] font-bold tracking-[0.14em]"
                    >
                      <Pencil className="h-3.5 w-3.5 text-vexia-cyan" aria-hidden />
                      EDITAR
                    </button>
                    <button
                      type="button"
                      onClick={clear}
                      aria-label="Remover lista"
                      className="vexia-focus grid h-9 w-9 place-items-center rounded-full border border-white/20"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-white/70" aria-hidden />
                    </button>
                  </div>
                </article>
              ) : null}
            </section>

            {!source ? (
              <p className="text-center text-xs text-white/60">
                Nenhuma lista salva ainda — adicione a primeira para liberar canais, filmes e séries.
              </p>
            ) : null}
          </div>

          {/* Coluna direita: dispositivo */}
          <aside className="hidden flex-col items-center justify-center gap-3 rounded-2xl border border-vexia-cyan/25 bg-black/45 p-6 text-center backdrop-blur-sm lg:flex">
            <VexiaLogo className="h-28" />
            <div className="mt-4">
              <p className="text-xs text-white/70">Endereço MAC</p>
              <p className="text-lg font-bold text-vexia-gold">{DEVICE_MAC}</p>
            </div>
            <div>
              <p className="text-xs text-white/70">Chave do dispositivo</p>
              <p className="text-lg font-bold text-vexia-gold">{DEVICE_KEY}</p>
            </div>
            <p className="mt-auto self-end text-[10px] text-white/50">v4.1</p>
          </aside>
        </div>

        <p className="pb-2 text-center text-xs font-bold tracking-[0.2em] text-white/80">
          Bem-vindo
        </p>
      </div>

      {/* Tela de cadastro (QR + acesso) */}
      {form ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-vexia-bg">
          <img
            src={nebulaAsset.url}
            alt=""
            aria-hidden
            className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="pointer-events-none fixed inset-0 bg-black/55" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-[4vw] py-5">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
              <button
                type="button"
                onClick={() => (source ? setForm(false) : void navigate({ to: "/home" }))}
                aria-label="Voltar"
                className="vexia-focus grid h-11 w-11 shrink-0 place-items-center rounded-full border border-vexia-purple/50 bg-black/50"
              >
                <ArrowLeft className="h-5 w-5 text-vexia-cyan" aria-hidden />
              </button>
              <div className="grid place-items-center">
                <VexiaLogo className="h-24 md:h-32" />
              </div>
              <span className="w-11" />
            </div>

            <div className="mt-2 grid flex-1 items-start gap-8 md:grid-cols-2 md:divide-x md:divide-vexia-cyan/40">
              {/* QR CODE */}
              <section className="flex flex-col items-center md:pr-8">
                <h2 className="text-xl font-bold tracking-[0.06em] md:text-2xl">
                  ACESSE POR QR CODE
                </h2>
                <div className="mt-5 rounded-sm bg-white p-4">
                  <QRCodeSVG value={qrValue} size={340} level="M" className="h-auto w-full max-w-[340px]" />
                </div>
                <p className="mt-4 max-w-[340px] text-center text-xs text-white/70">
                  Leia o QR Code no celular, copie o link da sua lista (M3U ou HLS) e cole aqui.
                </p>
                <button
                  type="button"
                  onClick={() => setQrDialog(true)}
                  className="vexia-focus mt-3 rounded-full border border-vexia-cyan/60 px-6 py-2.5 text-xs font-bold tracking-[0.14em] text-vexia-cyan"
                >
                  COLAR LINK DO QR CODE
                </button>
              </section>

              {/* ACESSO */}
              <section className="flex flex-col md:pl-8">
                <h2 className="text-center text-xl font-bold tracking-[0.06em] md:text-2xl">
                  DIGITE SEU ACESSO
                </h2>

                <div className="mt-5 space-y-4">
                  <input
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    onPaste={(e) => {
                      if (applyPaste(e.clipboardData.getData("text"), "server")) e.preventDefault();
                    }}
                    placeholder="Servidor (ex: http://meuservidor.com:8080)"
                    aria-label="Servidor"
                    className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-6 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                  />
                  <input
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    onPaste={(e) => {
                      if (applyPaste(e.clipboardData.getData("text"), "user")) e.preventDefault();
                    }}
                    placeholder="Usuário"
                    aria-label="Usuário"
                    className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-6 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                  />
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Senha"
                    aria-label="Senha"
                    className="w-full rounded-full border border-vexia-purple/70 bg-black/70 px-6 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={loading}
                    className="vexia-focus w-full rounded-full bg-vexia-purple px-6 py-3 text-base font-bold tracking-[0.1em] shadow-[0_0_40px_-12px_var(--vexia-purple)] disabled:opacity-60"
                  >
                    ENTRAR
                  </button>
                </div>

                <div className="mt-8">
                  <p className="text-base text-white/90">Campo de URL (M3U/HLS)</p>
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onPaste={(e) => {
                      if (applyPaste(e.clipboardData.getData("text"), "url")) e.preventDefault();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder="Cole o link aqui (.m3u, m3u_plus ou .m3u8)"
                    aria-label="Campo de URL M3U ou HLS"
                    className="mt-2 w-full rounded-full border border-vexia-purple/70 bg-black/70 px-6 py-3 text-base text-white placeholder:text-white/45 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={loading}
                    className="vexia-focus mt-3 w-full rounded-full border border-vexia-cyan/60 px-6 py-2.5 text-sm font-bold tracking-[0.12em] text-vexia-cyan disabled:opacity-60"
                  >
                    CARREGAR LINK
                  </button>
                </div>

                <p className="mt-5 text-center text-lg font-medium text-vexia-cyan">
                  MAC: {DEVICE_MAC}
                </p>
                <p className="mt-1 text-center text-lg text-white/90">
                  Seu Mundo Virtual Começa aqui!
                </p>

                {loading ? (
                  <p className="mt-4 flex items-center justify-center gap-2 text-sm text-vexia-cyan">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Conectando ao servidor...
                  </p>
                ) : null}
                {done ? (
                  <p className="mt-4 flex items-center justify-center gap-2 text-sm text-vexia-cyan">
                    <Check className="h-4 w-4" aria-hidden />
                    Lista carregada com sucesso
                  </p>
                ) : null}
                {formError ? (
                  <p className="mt-4 text-center text-sm text-vexia-gold">{formError}</p>
                ) : null}
                {error ? (
                  <p className="mt-4 text-center text-sm text-vexia-gold">{error}</p>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <QrPlaylistDialog open={qrDialog} onClose={() => setQrDialog(false)} />
    </main>
  );
}
