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
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#E6EBF5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>That page isn't here</div>
        <p style={{ fontSize: 14, color: "#8A97AE", lineHeight: 1.6, margin: "8px 0 20px" }}>Head back home and carry on.</p>
        <a
          href="/"
          style={{ display: "inline-block", padding: "11px 18px", borderRadius: 12, border: "none", background: "#D9B86A", color: "#10182A", fontWeight: 800, fontSize: 14, textDecoration: "none" }}
        >
          Go home
        </a>
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
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#E6EBF5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>Something didn't load</div>
        <p style={{ fontSize: 14, color: "#8A97AE", lineHeight: 1.6, margin: "8px 0 20px" }}>
          Your documents are safe on this device. Try again, or head back home.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            style={{ padding: "11px 18px", borderRadius: 12, border: "none", background: "#D9B86A", color: "#10182A", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ padding: "11px 18px", borderRadius: 12, border: "1px solid #27324A", color: "#E6EBF5", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0B1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "ReadiNes" },
      { name: "application-name", content: "ReadiNes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { title: "ReadiNes — Be ready for life's important moments" },
      { name: "description", content: "ReadiNes keeps your family's documents organized and event-ready. Be ready for life's important moments." },
      { name: "author", content: "ReadiNes" },
      { property: "og:title", content: "ReadiNes" },
      { property: "og:description", content: "Be ready for life's important moments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
          ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/icons/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Nunito+Sans:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
