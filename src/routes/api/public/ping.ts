import { createFileRoute } from "@tanstack/react-router";

/**
 * Ultra hafif erişilebilirlik yoklaması (kimlik doğrulama gerektirmez).
 * Melez erişim motoru bulut/yerel geçit ulaşılabilirliğini bununla ölçer.
 * Hiçbir kullanıcı ya da sistem verisi döndürmez.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      HEAD: async () =>
        new Response(null, { status: 200, headers: { "Cache-Control": "no-store", ...CORS } }),
      GET: async () =>
        new Response(JSON.stringify({ ok: true, service: "tedbirge", ts: Date.now() }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
        }),
    },
  },
});
