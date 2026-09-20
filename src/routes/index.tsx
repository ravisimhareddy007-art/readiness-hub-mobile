import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReadiNes — Be ready for life's important moments" },
      { name: "description", content: "Keep essential documents, health records, financial details, and family access ready in one secure place." },
      { property: "og:title", content: "ReadiNes" },
      { property: "og:description", content: "Be ready for life's important moments with one secure family vault." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <App />,
});
