import type { ParsedPlaylist } from "./m3u";

export type PlaylistDiff = {
  channelsAdded: number;
  channelsRemoved: number;
  moviesAdded: number;
  seriesAdded: number;
  /** true quando nada mudou entre a lista antiga e a nova. */
  unchanged: boolean;
};

function countNew(next: readonly { id: string }[], prevIds: Set<string>) {
  let n = 0;
  for (const item of next) if (!prevIds.has(item.id)) n++;
  return n;
}

/** Compara duas versões da mesma lista e resume o que mudou. */
export function diffPlaylists(prev: ParsedPlaylist, next: ParsedPlaylist): PlaylistDiff {
  const prevChannels = new Set(prev.channels.map((c) => c.id));
  const nextChannels = new Set(next.channels.map((c) => c.id));

  let channelsRemoved = 0;
  for (const id of prevChannels) if (!nextChannels.has(id)) channelsRemoved++;

  const diff: PlaylistDiff = {
    channelsAdded: countNew(next.channels, prevChannels),
    channelsRemoved,
    moviesAdded: countNew(next.movies, new Set(prev.movies.map((m) => m.id))),
    seriesAdded: countNew(next.series, new Set(prev.series.map((s) => s.id))),
    unchanged: false,
  };
  diff.unchanged =
    diff.channelsAdded === 0 &&
    diff.channelsRemoved === 0 &&
    diff.moviesAdded === 0 &&
    diff.seriesAdded === 0;
  return diff;
}

/** Frase curta para o aviso: "12 canais novos · 3 removidos". */
export function describeDiff(diff: PlaylistDiff): string {
  const parts: string[] = [];
  if (diff.channelsAdded) parts.push(`${diff.channelsAdded} canais novos`);
  if (diff.channelsRemoved) parts.push(`${diff.channelsRemoved} removidos`);
  if (diff.moviesAdded) parts.push(`${diff.moviesAdded} filmes novos`);
  if (diff.seriesAdded) parts.push(`${diff.seriesAdded} séries novas`);
  return parts.join(" · ");
}
