import { useNavigate } from "@tanstack/react-router";
import { Loader2, Play, Radio, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { setStreamHandoff } from "../../lib/stream-handoff";
import { usePlaylist } from "../../lib/playlist-store";
import type { PlaylistChannel } from "../../lib/m3u";
import {
  catchupUrl,
  fetchChannelEpgTable,
  liveStreamId,
  type EpgEntry,
} from "../../lib/xtream-extras";

function clock(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const yesterday = new Date(today.getTime() - 86_400_000).toDateString() === d.toDateString();
  if (same) return "HOJE";
  if (yesterday) return "ONTEM";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Catch-up / TV em replay — recurso portado do APK base (CatchUpActivity).
 *
 * Lista a grade já exibida do canal (`get_simple_data_table`) e reproduz o
 * programa gravado pelo endpoint `/timeshift` do painel.
 */
export function CatchupDialog({
  open,
  channel,
  onClose,
}: {
  open: boolean;
  channel: PlaylistChannel | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { source } = usePlaylist();
  const [entries, setEntries] = useState<EpgEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const streamId = liveStreamId(channel?.url);
  const playlistUrl = source?.url ?? "";

  useEffect(() => {
    if (!open || !playlistUrl || !streamId) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    fetchChannelEpgTable(playlistUrl, streamId, ctrl.signal)
      .then(setEntries)
      .catch(() => setError("Este canal não tem gravações disponíveis no servidor."))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [open, playlistUrl, streamId]);

  const past = useMemo(() => {
    const now = Date.now();
    return entries
      .filter((e) => e.stop < now && e.hasArchive)
      .sort((a, b) => b.start - a.start)
      .slice(0, 60);
  }, [entries]);

  if (!open || !channel) return null;

  const play = (program: EpgEntry) => {
    const url = catchupUrl(playlistUrl, streamId, program);
    if (!url) return;
    setStreamHandoff("live", channel.id, url);
    void navigate({ to: "/player", search: { type: "live", id: channel.id } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-vexia-purple/50 bg-vexia-card shadow-[0_0_60px_-16px_rgb(var(--vexia-primary-rgb)/0.9)]">
        <header className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
          <Radio className="h-4 w-4 text-vexia-cyan" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black uppercase tracking-[0.14em] text-vexia-text">
              Replay — {channel.name}
            </h2>
            <p className="text-[11px] text-vexia-muted">Programas já exibidos, gravados pelo servidor</p>
          </div>
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Fechar replay"
            className="vexia-focus rounded-lg border border-white/10 p-1.5 text-vexia-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="no-scrollbar max-h-[60vh] overflow-y-auto p-3">
          {loading ? (
            <p className="flex items-center gap-2 px-2 py-6 text-sm text-vexia-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando a grade do canal...
            </p>
          ) : error || past.length === 0 ? (
            <p className="px-2 py-6 text-sm text-vexia-muted">
              {error || "Nenhum programa gravado para este canal."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {past.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => play(p)}
                    className="vexia-focus flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left"
                  >
                    <span className="w-24 shrink-0 text-[11px] font-black uppercase tracking-wider text-vexia-cyan">
                      {dayLabel(p.start)} {clock(p.start)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-vexia-text">{p.title}</span>
                      <span className="block truncate text-[11px] text-vexia-muted">
                        {clock(p.start)} – {clock(p.stop)}
                        {p.description ? ` • ${p.description}` : ""}
                      </span>
                    </span>
                    <Play className="h-4 w-4 shrink-0 text-vexia-purple" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default CatchupDialog;
