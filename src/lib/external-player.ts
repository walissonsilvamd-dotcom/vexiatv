/**
 * Abertura do conteúdo em um player externo (MX Player, VLC, etc.).
 *
 * Em Android/Android TV usamos "intent://" para entregar o link direto ao app
 * escolhido. Em qualquer outro ambiente (PC, navegador de TV) caímos no
 * comportamento universal: abrir o link em uma nova aba, que o sistema
 * repassa ao aplicativo padrão de vídeo.
 */

export type ExternalApp = "mx" | "vlc" | "default";

export const EXTERNAL_APPS: { id: ExternalApp; label: string; hint: string }[] = [
  { id: "default", label: "App padrão do aparelho", hint: "Deixa o sistema escolher" },
  { id: "mx", label: "MX Player", hint: "com.mxtech.videoplayer.ad" },
  { id: "vlc", label: "VLC", hint: "org.videolan.vlc" },
];

function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

function intentUrl(url: string, pkg: string, title: string) {
  const clean = url.replace(/^https?:\/\//, "");
  const scheme = url.startsWith("https") ? "https" : "http";
  return (
    `intent://${clean}#Intent;scheme=${scheme};type=video/*;package=${pkg};` +
    `S.title=${encodeURIComponent(title)};end`
  );
}

/** Tenta abrir o link no player externo. Retorna false se não foi possível. */
export function openInExternalPlayer(url: string, title: string, app: ExternalApp = "default") {
  if (!url) return false;
  try {
    if (isAndroid() && app !== "default") {
      const pkg = app === "mx" ? "com.mxtech.videoplayer.ad" : "org.videolan.vlc";
      window.location.href = intentUrl(url, pkg, title);
      return true;
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) return true;
    window.location.href = url;
    return true;
  } catch {
    return false;
  }
}
