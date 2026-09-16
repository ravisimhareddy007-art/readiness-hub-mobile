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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
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
      { rel: "icon", type: "image/svg+xml", href: "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%201024%201024%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%221024%22%20height%3D%221024%22%20rx%3D%22232%22%20fill%3D%22%231E242B%22/%3E%3Cg%20transform%3D%22translate%28126.8%2C80%29%20scale%283.6%29%22%3E%3Cpath%20d%3D%22M%2060.20%2C114.70%20L%2080.66%2C98.67%20L%20168.71%2C211.00%20L%20135.67%2C211.00%20Z%22%20fill%3D%22none%22%20stroke%3D%22%23D9A441%22%20stroke-linecap%3D%22butt%22%20stroke-width%3D%2228%22/%3E%3Cg%20transform%3D%22translate%28140.64%2C173.66%29%20rotate%2851.9%29%22%3E%3Crect%20x%3D%220%22%20y%3D%22-26%22%20width%3D%2219%22%20height%3D%2228%22%20rx%3D%224%22%20fill%3D%22%23D9A441%22/%3E%3C/g%3E%3Cg%20transform%3D%22translate%28155.44%2C192.56%29%20rotate%2851.9%29%22%3E%3Crect%20x%3D%220%22%20y%3D%22-26%22%20width%3D%2219%22%20height%3D%2228%22%20rx%3D%224%22%20fill%3D%22%23D9A441%22/%3E%3C/g%3E%3Cpath%20d%3D%22M58%2029%20V211%22%20fill%3D%22none%22%20stroke%3D%22%23D9A441%22%20stroke-linecap%3D%22butt%22%20stroke-width%3D%2228%22/%3E%3Cpath%20d%3D%22M45%2029%20H112%20C164%2029%20164%20135%20112%20135%20H45%20Z%22%20fill%3D%22%23D9A441%22/%3E%3Ccircle%20cx%3D%22102%22%20cy%3D%2272%22%20r%3D%2224%22%20fill%3D%22%231E242B%22/%3E%3Cpath%20d%3D%22M92%2084%20L82%20120%20H122%20L112%2084%20Z%22%20fill%3D%22%231E242B%22/%3E%3C/g%3E%3C/svg%3E" },
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
