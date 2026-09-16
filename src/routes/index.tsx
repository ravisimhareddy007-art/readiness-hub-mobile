import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "ReadiNes" }],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
