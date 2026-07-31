import { Clapperboard, Film, Tv } from "lucide-react";
import logoAsset from "../../assets/vexia-logo-tv.png.asset.json";

/**
 * Arte gerada para itens sem capa.
 * Nenhum card do VÉXIA pode ficar vazio: quando a lista não traz pôster e o
 * TMDB não encontra correspondência, desenhamos uma capa própria — gradiente
 * determinístico (mesmo título = mesma arte), iniciais grandes, título e a
 * marca VÉXIA. Visualmente parece uma capa real, nunca um erro.
 */

const PALETTES: Array<[string, string, string]> = [
  ["#7B2BBE", "#2A0B45", "#00C8FF"],
  ["#4A1A8C", "#0B0B18", "#7B2BBE"],
  ["#00C8FF", "#062033", "#7B2BBE"],
  ["#B02BBE", "#2A0B2E", "#00C8FF"],
  ["#2B4BBE", "#0A1230", "#00C8FF"],
  ["#BE2B6B", "#2A0B18", "#7B2BBE"],
];

function hashOf(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function initialsOf(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "TV";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function PosterArt({
  title,
  kind = "movie",
  className = "",
  compact = false,
}: {
  title: string;
  kind?: "movie" | "series" | "live";
  className?: string;
  compact?: boolean;
}) {
  const hash = hashOf(title || "vexia");
  const [from, mid, accent] = PALETTES[hash % PALETTES.length];
  const angle = 120 + (hash % 5) * 25;
  const Icon = kind === "live" ? Tv : kind === "series" ? Clapperboard : Film;

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(${angle}deg, ${from} 0%, ${mid} 55%, #050505 100%)` }}
      aria-hidden={false}
      role="img"
      aria-label={title}
    >
      {/* halo difuso */}
      <span
        className="pointer-events-none absolute -top-1/4 left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full opacity-45 blur-3xl"
        style={{ background: accent }}
      />
      {/* textura de linhas finas */}
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 9px)",
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5 px-3 text-center">
        <span
          className={`font-black leading-none tracking-tight text-white/95 drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] ${
            compact ? "text-2xl" : "text-4xl md:text-5xl"
          }`}
        >
          {initialsOf(title)}
        </span>
        {!compact ? (
          <span className="line-clamp-3 text-[11px] font-bold leading-tight text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {title}
          </span>
        ) : null}
        <Icon className="h-3.5 w-3.5 text-white/60" aria-hidden />
      </div>
      {!compact ? (
        <img
          src={logoAsset.url}
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 opacity-70"
        />
      ) : null}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
    </div>
  );
}
