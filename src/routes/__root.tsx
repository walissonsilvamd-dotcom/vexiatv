import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { PlaylistProvider } from "../lib/playlist-store";
import { SettingsProvider } from "../lib/settings-store";
import { OfflineBanner } from "../components/vexia/OfflineBanner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerImageCache, warmStartCache } from "../lib/image-cache";
import logoAsset from "../assets/vexia-logo-tv.png.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VÉXIA TV" },
      { name: "description", content: "VÉXIA TV — player de streaming para Smart TV." },
      { name: "author", content: "VÉXIA TV" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;700;900&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://image.tmdb.org", crossOrigin: "anonymous" },
      { rel: "preload", as: "image", href: logoAsset.url },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "apple-touch-icon", type: "image/png", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Filtros de otimização de imagem (unsharp mask real + limpeza de ruído).
            Precisam existir no documento para que o CSS possa referenciá-los. */}
        <svg
          aria-hidden
          focusable="false"
          width="0"
          height="0"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <defs>
            {/* Nitidez leve: convolução 3x3 tipo "unsharp mask". */}
            <filter id="vexia-sharpen-soft" colorInterpolationFilters="sRGB">
              <feConvolveMatrix
                order="3"
                preserveAlpha="true"
                kernelMatrix="0 -0.18 0 -0.18 1.72 -0.18 0 -0.18 0"
              />
            </filter>
            {/* Nitidez média: micro-desfoque remove ruído/bloco de JPEG antes
                de reforçar as bordas. */}
            <filter id="vexia-sharpen-medium" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="0.35" result="clean" />
              <feConvolveMatrix
                in="clean"
                order="3"
                preserveAlpha="true"
                kernelMatrix="0 -0.3 0 -0.3 2.2 -0.3 0 -0.3 0"
              />
            </filter>
            {/* Ampliação grande: limpeza mais forte + reforço de borda maior. */}
            <filter id="vexia-sharpen-strong" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="0.6" result="clean" />
              <feConvolveMatrix
                in="clean"
                order="3"
                preserveAlpha="true"
                kernelMatrix="-0.1 -0.4 -0.1 -0.4 3.0 -0.4 -0.1 -0.4 -0.1"
              />
            </filter>
          </defs>
        </svg>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerImageCache();
    // Reaquece o cache com as imagens da última sessão (abertura instantânea).
    warmStartCache();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <PlaylistProvider>
          <OfflineBanner />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </PlaylistProvider>
      </SettingsProvider>
    </QueryClientProvider>

  );
}
