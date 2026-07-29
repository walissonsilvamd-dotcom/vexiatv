import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { VexiaLogo } from "../components/vexia/VexiaLogo";
import { useSpatialNav } from "../hooks/use-spatial-nav";
import { DEVICE_MAC } from "../data/vexia-catalog";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "VÉXIA TV — Acesso" },
      {
        name: "description",
        content: "Entre no VÉXIA TV com usuário e senha ou carregue sua lista por QR Code.",
      },
      { property: "og:title", content: "VÉXIA TV — Acesso" },
      { property: "og:description", content: "Login e ativação por QR Code no VÉXIA TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const scopeRef = useRef<HTMLDivElement>(null);
  useSpatialNav(scopeRef);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [url, setUrl] = useState("");

  const field =
    "w-full rounded-lg border border-vexia-purple bg-vexia-card px-4 py-2.5 text-sm text-vexia-text placeholder:text-vexia-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-vexia-purple-soft";

  return (
    <main ref={scopeRef} className="min-h-screen bg-vexia-bg px-5 py-10 text-vexia-text">
      <div className="mx-auto w-full max-w-md space-y-6 text-center">
        <VexiaLogo className="mx-auto h-20" />
        <h1 className="text-lg font-bold tracking-wide">DIGITE SEU ACESSO</h1>

        <div className="space-y-3 text-left">
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Usuário"
            className={field}
          />
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            placeholder="Senha"
            className={field}
          />
          <button
            type="button"
            data-nav-row={1}
            tabIndex={0}
            onClick={() => navigate({ to: "/home" })}
            className="vexia-focus w-full rounded-full bg-vexia-purple py-3 text-xs font-black tracking-wide"
          >
            ENTRAR
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-vexia-purple/40" />
          <span className="text-[11px] font-bold tracking-wide text-vexia-purple-soft">
            OU ACESSE POR QR CODE
          </span>
          <span className="h-px flex-1 bg-vexia-purple/40" />
        </div>

        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-vexia-purple bg-white p-4">
            <QRCodeSVG value={url || "https://vexia.tv/ativar"} size={170} />
          </div>
        </div>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole aqui o link M3U ou HLS"
          className={field}
        />

        <p className="text-[11px] text-vexia-cyan">MAC: {DEVICE_MAC}</p>
        <p className="text-[11px] text-vexia-muted">Seu Mundo Virtual Começa aqui!</p>
      </div>
    </main>
  );
}
