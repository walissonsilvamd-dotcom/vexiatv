/**
 * Prefetch de detalhes no foco — truque de fluidez do APK base.
 *
 * Quando o cliente para em um card (D-pad ou mouse) por ~250 ms, já buscamos
 * o que a tela de detalhes vai precisar: episódios da série (`get_series_info`),
 * dados do filme (`get_vod_info`) e a arte grande. Assim, ao apertar OK, a
 * tela abre com tudo pronto — sem espera visível.
 *
 * Regras para não pesar na TV:
 *  - um único prefetch ativo por vez (o anterior é descartado);
 *  - nada acontece antes do debounce (zapping rápido não gera requisição);
 *  - tudo passa pelo cache persistente, então repetir foco não custa rede.
 */

import { preloadImages } from "./image";
import { fetchXtreamEpisodes, fetchXtreamVodInfo, xtreamStreamId } from "./xtream-catalog";

type PrefetchTarget = {
  id: string;
  kind: "movie" | "series";
  seriesId?: number;
  streamUrl?: string;
  poster?: string;
  backdrop?: string;
};

const DEBOUNCE = 250;

let playlistUrl = "";
let timer: ReturnType<typeof setTimeout> | null = null;
let lastId = "";
const done = new Set<string>();

/** O store da lista informa qual playlist está ativa. */
export function setPrefetchSource(url: string) {
  if (url === playlistUrl) return;
  playlistUrl = url;
  done.clear();
}

export function cancelDetailPrefetch() {
  if (timer) clearTimeout(timer);
  timer = null;
}

async function run(target: PrefetchTarget) {
  const art = [target.backdrop, target.poster].filter(Boolean) as string[];
  if (art.length) preloadImages(art.slice(0, 1), "hero");

  if (!playlistUrl) return;
  try {
    if (target.kind === "series") {
      if (target.seriesId) await fetchXtreamEpisodes(playlistUrl, target.seriesId);
    } else {
      const streamId = xtreamStreamId(target.streamUrl);
      if (streamId) await fetchXtreamVodInfo(playlistUrl, streamId);
    }
  } catch {
    /* prefetch é oportunista: falhar aqui não afeta a navegação */
  }
}

/** Chamado no foco/hover de um card. */
export function prefetchDetail(target: PrefetchTarget) {
  if (!target.id || done.has(target.id)) return;
  if (target.id === lastId && timer) return;
  lastId = target.id;
  cancelDetailPrefetch();
  timer = setTimeout(() => {
    timer = null;
    done.add(target.id);
    void run(target);
  }, DEBOUNCE);
}
