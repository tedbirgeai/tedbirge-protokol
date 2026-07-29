import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Gerçek Tedbirge Gateway düğümleri için telemetri/heartbeat alım uç noktası.
 * Kimlik doğrulama: X-Tedbirge-License başlığındaki lisans anahtarı.
 * İçerik taşınmaz; yalnızca ölçüm metrikleri kabul edilir.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tedbirge-License",
};

const Body = z.object({
  node_id: z.string().min(1).max(64),
  label: z.string().max(120).optional(),
  region: z.enum(["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"]).optional(),
  carrier: z.string().max(40).optional(),
  firmware: z.string().max(40).optional(),
  rtt_ms: z.number().min(0).max(600000).optional(),
  throughput_kbps: z.number().min(0).max(10_000_000).optional(),
  packet_loss_pct: z.number().min(0).max(100).optional(),
  hops: z.number().int().min(0).max(64).optional(),
  bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  note: z.string().max(500).optional(),
  error_code: z.string().max(40).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/telemetry")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const licenseKey = request.headers.get("x-tedbirge-license")?.trim();
        if (!licenseKey || licenseKey.length < 16 || licenseKey.length > 128) {
          return json({ error: "missing_or_invalid_license" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Lisans kimliği kullanım grafikleri ve 429 özetleri için önce çözümlenir.
        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, user_id, status, node_limit, current_period_end")
          .eq("license_key", licenseKey)
          .maybeSingle();

        const logUsage = async (statusCode: number) => {
          if (!license) return;
          await supabaseAdmin.from("api_usage_events").insert({
            license_id: license.id,
            user_id: license.user_id,
            endpoint: "telemetry",
            status_code: statusCode,
          });
        };

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const limit = await checkApiRateLimit("telemetry", licenseKey);
        if (!limit.ok) {
          await logUsage(429);
          if (license?.user_id) {
            const { dispatchWebhook } = await import("@/lib/webhooks.server");
            await dispatchWebhook(license.user_id, "rate_limited", {
              license_id: license.id,
              endpoint: "telemetry",
              retry_after_seconds: limit.retryAfterSeconds,
              message: limit.message,
            });
          }
          return new Response(JSON.stringify({ error: limit.message }), {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(limit.retryAfterSeconds),
              ...CORS,
            },
          });
        }


        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ error: "invalid_body" }, 400);
        }

        if (!license) {
          return json({ error: "license_not_found" }, 401);
        }
        if (!["active", "trialing", "pilot", "pending"].includes(license.status)) {
          await logUsage(403);
          return json({ error: "license_inactive", status: license.status }, 403);
        }
        if (license.current_period_end && new Date(license.current_period_end) < new Date()) {
          await logUsage(403);
          return json({ error: "license_expired" }, 403);
        }


        const { data: existing } = await supabaseAdmin
          .from("devices")
          .select("id, status")
          .eq("license_id", license.id)
          .eq("node_id", parsed.node_id)
          .maybeSingle();

        if (existing?.status === "revoked") {
          return json({ error: "device_revoked" }, 403);
        }

        if (!existing) {
          const { count } = await supabaseAdmin
            .from("devices")
            .select("id", { count: "exact", head: true })
            .eq("license_id", license.id);
          if ((count ?? 0) >= license.node_limit) {
            return json({ error: "node_limit_reached", node_limit: license.node_limit }, 403);
          }
        }

        const { data: device, error: deviceError } = await supabaseAdmin
          .from("devices")
          .upsert(
            {
              license_id: license.id,
              user_id: license.user_id,
              node_id: parsed.node_id,
              label: parsed.label ?? null,
              region: parsed.region ?? "TR",
              carrier: parsed.carrier ?? null,
              firmware: parsed.firmware ?? null,
              status: "active",
              last_seen_at: new Date().toISOString(),
              last_error_code: parsed.error_code ?? null,
              last_error_at: parsed.error_code ? new Date().toISOString() : null,
            },
            { onConflict: "license_id,node_id" },
          )
          .select("id")
          .single();

        if (deviceError || !device) return json({ error: "device_register_failed" }, 500);

        if (!existing) {
          await supabaseAdmin.from("license_events").insert({
            license_id: license.id,
            user_id: license.user_id,
            device_id: device.id,
            event: "device_auto_registered",
            detail: `${parsed.node_id} · ${parsed.region ?? "TR"} · ${parsed.carrier ?? "—"}`,
            actor: "node",
          });
        }


        const hasMetric =
          parsed.rtt_ms !== undefined ||
          parsed.throughput_kbps !== undefined ||
          parsed.packet_loss_pct !== undefined ||
          parsed.bytes !== undefined;

        if (hasMetric) {
          await supabaseAdmin.from("telemetry_samples").insert({
            device_id: device.id,
            license_id: license.id,
            carrier: parsed.carrier ?? null,
            rtt_ms: parsed.rtt_ms ?? null,
            throughput_kbps: parsed.throughput_kbps ?? null,
            packet_loss_pct: parsed.packet_loss_pct ?? null,
            hops: parsed.hops ?? null,
            bytes: parsed.bytes ?? null,
            note: parsed.note ?? null,
          });
        }

        await logUsage(200);

        return json({
          ok: true,
          device_id: device.id,
          recorded: hasMetric,
          node_limit: license.node_limit,
          // Bölge profili: düğüm bu değeri kendi taşıyıcı kilidi için kullanır.
          region: parsed.region ?? "TR",
        });
      },
    },
  },
});
