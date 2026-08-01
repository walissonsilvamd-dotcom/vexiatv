/**
 * SEO dinâmico para páginas cujo conteúdo vem da lista M3U/TMDB (cliente).
 *
 * O head() das rotas dinâmicas não conhece o título real (não há loader no
 * servidor), então aqui atualizamos title/description/og:* e injetamos o
 * JSON-LD (Movie / TVSeries) com os dados reais depois da hidratação.
 */

import { useEffect } from "react";

type SeoInput = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, unknown> | null;
  /** id único do bloco JSON-LD, para não duplicar scripts. */
  jsonLdId?: string;
};

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function useDynamicSeo({
  title,
  description,
  image,
  url,
  jsonLd,
  jsonLdId = "vexia-dynamic-jsonld",
}: SeoInput) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', "property", "og:title", title);
      setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    }
    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
    }
    if (image) {
      setMeta('meta[property="og:image"]', "property", "og:image", image);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    }
    if (url) {
      setMeta('meta[property="og:url"]', "property", "og:url", url);
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = url;
    }

    if (jsonLd) {
      let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = jsonLdId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      document.getElementById(jsonLdId)?.remove();
    };
  }, [title, description, image, url, jsonLd, jsonLdId]);
}
