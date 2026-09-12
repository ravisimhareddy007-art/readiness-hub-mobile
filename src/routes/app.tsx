import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "ReadiNes" },
      { name: "description", content: "Your personal document vault. Classify, track, and assemble for any life event." },
    ],
  }),
  component: () => <App />,
});