import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { VexiaLogo } from "./VexiaLogo";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-vexia-bg text-vexia-text">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 0%, color-mix(in oklab, var(--vexia-purple) 35%, transparent), transparent 70%), radial-gradient(55% 45% at 90% 10%, color-mix(in oklab, var(--vexia-cyan) 22%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1600px] px-6 py-8 md:px-12">
        <header className="flex items-center justify-between gap-6">
          <VexiaLogo className="h-14" />
          <Link
            to="/home"
            className="vexia-focus flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide"
          >
            <ArrowLeft className="h-4 w-4 text-vexia-cyan" aria-hidden /> VOLTAR
          </Link>
        </header>

        <div className="mt-10">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-vexia-muted">{subtitle}</p> : null}
        </div>

        <div className="mt-8 space-y-10">{children}</div>
      </div>
    </main>
  );
}
