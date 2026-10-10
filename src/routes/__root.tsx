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
        background: "var(--color-surface-canvas)",
        color: "var(--color-text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 700, color: "var(--color-text-heading)" }}>That page isn't here</div>
        <p style={{ fontSize: "var(--text-body-md-size)", color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "8px 0 20px" }}>Head back home and carry on.</p>
        <a
          href="/"
          style={{ display: "inline-block", padding: "11px 18px", borderRadius: "var(--surface-radius)", border: "none", background: "var(--color-action-primary-default)", color: "var(--color-text-on-brand)", fontWeight: 700, fontSize: "var(--text-body-md-size)", textDecoration: "none" }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-surface-canvas)",
        color: "var(--color-text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: "var(--text-body-lg-size)", fontWeight: 700, color: "var(--color-text-heading)" }}>Something didn't load</div>
        <p style={{ fontSize: "var(--text-body-md-size)", color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "8px 0 20px" }}>
          Your documents are safe on this device. Try again, or head back home.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            style={{ padding: "11px 18px", borderRadius: "var(--surface-radius)", border: "none", background: "var(--color-action-primary-default)", color: "var(--color-text-on-brand)", fontWeight: 700, fontSize: "var(--text-body-md-size)", cursor: "pointer" }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ padding: "11px 18px", borderRadius: "var(--surface-radius)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)", fontWeight: 700, fontSize: "var(--text-body-md-size)", textDecoration: "none" }}
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
      { name: "theme-color", content: "#121216" }, /* token-source */ // meta tags cannot read CSS; this is color/surface/canvas (dark),
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
