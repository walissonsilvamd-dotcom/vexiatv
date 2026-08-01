import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://vexiatv.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

/** Rotas públicas do app (catálogo real depende da lista do usuário). */
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/home", changefreq: "weekly", priority: "0.9" },
  { path: "/filmes", changefreq: "weekly", priority: "0.8" },
  { path: "/series", changefreq: "weekly", priority: "0.8" },
  { path: "/canais", changefreq: "weekly", priority: "0.8" },
  { path: "/jogos", changefreq: "daily", priority: "0.7" },
  { path: "/busca", changefreq: "monthly", priority: "0.5" },
  { path: "/favoritos", changefreq: "monthly", priority: "0.5" },
  { path: "/historico", changefreq: "monthly", priority: "0.4" },
  { path: "/filtros", changefreq: "monthly", priority: "0.4" },
  { path: "/listas", changefreq: "monthly", priority: "0.6" },
  { path: "/parear", changefreq: "monthly", priority: "0.5" },
  { path: "/configuracoes", changefreq: "monthly", priority: "0.4" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
