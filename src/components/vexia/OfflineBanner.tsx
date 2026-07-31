import { WifiOff } from "lucide-react";
import { useOnline } from "../../hooks/use-online";

/**
 * Aviso discreto e global de "sem conexão". Aparece no topo da tela e some
 * sozinho quando a rede volta — o conteúdo já baixado continua utilizável.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 py-2"
    >
      <span className="pointer-events-auto flex items-center gap-2 rounded-full border border-vexia-purple/50 bg-black/85 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-vexia-text shadow-[0_0_24px_rgb(var(--vexia-primary-rgb)/0.55)] backdrop-blur-xl">
        <WifiOff className="h-3.5 w-3.5 text-vexia-cyan" aria-hidden />
        Sem conexão — exibindo o conteúdo salvo
      </span>
    </div>
  );
}
