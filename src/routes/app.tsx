import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "ReadiNes" },
      { name: "description", content: "Your personal document vault. Classify, track, and assemble for any life event." },
      { property: "og:title", content: "ReadiNes — Personal readiness vault" },
      { property: "og:description", content: "Keep documents, health records, wealth details, and family access ready." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <App />,
});