import { createFileRoute } from "@tanstack/react-router";
import { Github, Smartphone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Readiness — Mobile App Coming Soon" },
      {
        name: "description",
        content:
          "Readiness mobile app placeholder. The mobile experience is under development and code arrives via GitHub sync.",
      },
      { property: "og:title", content: "Readiness — Mobile App Coming Soon" },
      {
        property: "og:description",
        content:
          "Readiness mobile app placeholder. The mobile experience is under development and code arrives via GitHub sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
        <Smartphone className="size-8 text-primary" />
      </div>

      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
        Readiness
      </h1>
      <p className="mt-1 text-sm font-medium text-primary">Mobile version</p>

      <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
        This is a placeholder for the mobile experience. The app code will
        arrive here automatically via GitHub sync.
      </p>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <Github className="size-3.5" />
        <span>Awaiting code from GitHub</span>
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}
