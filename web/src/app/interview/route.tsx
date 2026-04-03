import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/interview")({
  component: InterviewLayout,
});

function InterviewLayout() {
  return <Outlet />;
}
