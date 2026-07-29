import { Check, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEVICE_MAC } from "../../data/vexia-catalog";
import { usePlaylist } from "../../lib/playlist-store";

const LOADING_MESSAGES = [
  "Validando link...",
  "Conectando ao servidor...",
  "Carregando canais...",
  "Organizando filmes e séries...",
  "Finalizando...",
];

export function QrPlaylistDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { loadFromUrl, loading, error, source } = usePlaylist();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setUrl("");
      setDone(false);
      setStep(0);
      return;
    }
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!loading) {
      setStep(0);
      return;
    }
    const id = setInterval(() => {
      setStep((s) => (s + 1 < LOADING_MESSAGES.length ? s + 1 : s));
    }, 1200);
    return () => clearInterval(id);
  }, [loading]);

  if (!open) return null;

  const submit = () => {
    if (!url.trim()) return;
    const finalName = name.trim() || "Minha Lista IPTV";
    onClose();
    void navigate({ to: "/carregando", search: { url: url.trim(), name: finalName } });
  };

  const isLoading = loading || done;
  const statusText = done
    ? "Lista carregada com sucesso"
    : LOADING_MESSAGES[step] ?? LOADING_MESSAGES[0];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-[440px] rounded-3xl border border-vexia-purple/40 bg-vexia-popup p-7 shadow-[0_0_60px_-20px_rgba(123,47,190,0.55),0_0_120px_-40px_rgba(0,0,0,0.9)]">
        {/* Cabeçalho */}
        <div className="relative">
          <h2 className="text-center text-xl font-black uppercase tracking-[0.12em] text-white">
            ADICIONAR LISTA
          </h2>
          <p className="mt-1 text-center text-xs text-vexia-muted">
            Insira os dados da sua lista IPTV
          </p>
          <button
            type="button"
            onClick={() => !isLoading && onClose()}
            disabled={isLoading}
            aria-label="Fechar"
            className="absolute right-0 top-0 grid h-8 w-8 place-items-center rounded-full text-vexia-cyan transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Formulário */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-white">
              Nome da lista
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="Minha Lista IPTV"
              disabled={isLoading}
              aria-label="Nome da lista"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/35 transition-all focus:border-vexia-purple focus:outline-none focus:ring-2 focus:ring-vexia-purple/40 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-white">
              Link da lista M3U ou HLS
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="https://servidor.com/lista.m3u"
              disabled={isLoading}
              aria-label="Link da lista M3U ou HLS"
              className="w-full rounded-xl border border-white/15 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/35 transition-all focus:border-vexia-purple focus:outline-none focus:ring-2 focus:ring-vexia-purple/40 disabled:opacity-60"
            />
            <p className="mt-1.5 text-[10px] text-vexia-muted">
              Aceita links M3U, M3U8 e HLS
            </p>
          </div>

          {/* Status */}
          {isLoading || error ? (
            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center">
              {isLoading ? (
                <p className="flex items-center justify-center gap-2 text-xs font-bold text-vexia-cyan">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {statusText}
                </p>
              ) : (
                <p className="text-xs font-semibold text-vexia-gold">{error}</p>
              )}
            </div>
          ) : null}

          {/* Botões */}
          <div className="grid gap-3 pt-1">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={isLoading || !url.trim()}
              className="vexia-focus group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-vexia-purple px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_35px_-8px_rgba(123,47,190,0.65),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:shadow-[0_0_45px_-6px_rgba(123,47,190,0.8),inset_0_1px_0_rgba(255,255,255,0.35)] disabled:opacity-50"
            >
              <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" aria-hidden />
              {done ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  LISTA CARREGADA
                </>
              ) : (
                "CARREGAR LISTA"
              )}
            </button>

            <button
              type="button"
              onClick={() => !isLoading && onClose()}
              disabled={isLoading}
              className="vexia-focus rounded-xl border border-vexia-cyan/40 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-vexia-cyan transition-colors hover:bg-vexia-cyan/10 disabled:opacity-50"
            >
              CANCELAR
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center">
          <p className="text-xs font-semibold text-vexia-cyan">
            MAC: {DEVICE_MAC}
          </p>
          <p className="mt-1 text-[11px] text-vexia-muted">
            Seu Mundo Virtual Começa aqui!
          </p>
        </div>
      </div>
    </div>
  );
}
