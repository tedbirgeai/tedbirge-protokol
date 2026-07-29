import { createFileRoute } from "@tanstack/react-router";
import { OPENAPI_SPEC } from "@/lib/api-spec";

export const Route = createFileRoute("/api/public/openapi[.]json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
