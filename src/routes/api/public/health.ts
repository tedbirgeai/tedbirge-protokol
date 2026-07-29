import { createFileRoute } from "@tanstack/react-router";

/**
 * Tek sistem sağlık uç noktası.
 * Kimlik doğrulama: X-Tedbirge-License başlığındaki lisans anahtarı.
 * Dönüş: kuyruk gecikmesi, teslimat oranı, son telemetri yaşı, kesinti ve 429 özeti.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tedbirge-License",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const licenseKey = request.headers.get("x-tedbirge-license")?.trim();
        if (!licenseKey || licenseKey.length < 16 || licenseKey.length > 128) {
          return json({ error: "missing_or_invalid_license" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, status")
          .eq("license_key", licenseKey)
          .maybeSingle();

        if (!license || license.status !== "active") {
          return json({ error: "license_not_found_or_inactive" }, 403);
        }

        const { computeHealth } = await import("@/lib/health.server");
        const report = await computeHealth(supabaseAdmin as never, [license.id]);
        return json(report);
      },
    },
  },
});
