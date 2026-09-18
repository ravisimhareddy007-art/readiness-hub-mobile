import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "ReadiNes" }],
  }),
  component: () => <App />,
});
