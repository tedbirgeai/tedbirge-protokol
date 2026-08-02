import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sohbet")({
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
