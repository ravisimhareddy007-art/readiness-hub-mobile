import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import Landing from "@/components/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReadiNes — Be ready for life's important moments" },
      {
        name: "description",
        content:
          "Classify, track, and assemble your documents for real life events. Includes a hallucination-safe Healthcare module.",
      },
      { property: "og:title", content: "ReadiNes" },
      { property: "og:description", content: "AI-powered personal document intelligence." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  return <Landing onEnter={() => navigate({ to: "/app" })} />;
}
