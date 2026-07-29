import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Store-and-forward mesaj kuyruğu.
 * İnternet/mesh bağlantısı koptuğunda düğüm mesajları yerelde tutar; bağlantı
 * geri geldiğinde bu uç noktaya sırayla yükler. Hedef düğüm çevrimiçi olunca
 * kuyruğu öncelik + sıra düzeninde çeker ve teslim aldığını bildirir.
 *
 * Kimlik: X-Tedbirge-License başlığı.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tedbirge-License",
};

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("enqueue"),
    node_id: z.string().min(1).max(64),
    messages: z
      .array(
        z.object({
          target_node: z.string().max(64).optional(),
          payload: z.record(z.string(), z.unknown()).default({}),
          priority: z.number().int().min(1).max(9).default(5),
          queued_at: z.string().datetime().optional(),
        }),
      )
      .min(1)
      .max(200),
  }),
  z.object({
    action: z.literal("fetch"),
    node_id: z.string().min(1).max(64),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  z.object({
    action: z.literal("ack"),
    node_id: z.string().min(1).max(64),
    ids: z.array(z.string().uuid()).min(1).max(200),
  }),
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/queue")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const licenseKey = request.headers.get("x-tedbirge-license")?.trim();
        if (!licenseKey || licenseKey.length < 16 || licenseKey.length > 128) {
          return json({ error: "missing_or_invalid_license" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, user_id, status")
          .eq("license_key", licenseKey)
          .maybeSingle();
        if (!license) return json({ error: "license_not_found" }, 401);
        if (!["active", "trialing", "pilot", "pending"].includes(license.status)) {
          return json({ error: "license_inactive" }, 403);
        }

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const limit = await checkApiRateLimit("queue", licenseKey);
        if (!limit.ok) {
          await supabaseAdmin.from("api_usage_events").insert({
            license_id: license.id,
            user_id: license.user_id,
            endpoint: "queue",
            status_code: 429,
          });
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

        const { data: device } = await supabaseAdmin
          .from("devices")
          .select("id, status")
          .eq("license_id", license.id)
          .eq("node_id", parsed.node_id)
          .maybeSingle();
        if (device?.status === "revoked") return json({ error: "device_revoked" }, 403);

        const logUsage = (code: number) =>
          supabaseAdmin.from("api_usage_events").insert({
            license_id: license.id,
            user_id: license.user_id,
            endpoint: "queue",
            status_code: code,
          });

        if (parsed.action === "enqueue") {
          const rows = parsed.messages.map((m) => ({
            license_id: license.id,
            user_id: license.user_id,
            device_id: device?.id ?? null,
            origin_node: parsed.node_id,
            target_node: m.target_node ?? null,
            payload: m.payload as never,
            priority: m.priority,
            status: "queued",
            queued_at: m.queued_at ?? new Date().toISOString(),
          }));
          const { data: inserted, error } = await supabaseAdmin
            .from("mesh_messages")
            .insert(rows)
            .select("id");
          if (error) return json({ error: "enqueue_failed" }, 500);
          await logUsage(200);
          return json({ ok: true, accepted: inserted?.length ?? 0, ids: inserted?.map((r) => r.id) ?? [] });
        }

        if (parsed.action === "fetch") {
          const { data: pending } = await supabaseAdmin
            .from("mesh_messages")
            .select("id, origin_node, target_node, payload, priority, queued_at, attempts")
            .eq("license_id", license.id)
            .eq("status", "queued")
            .gt("expires_at", new Date().toISOString())
            .or(`target_node.eq.${parsed.node_id},target_node.is.null`)
            .neq("origin_node", parsed.node_id)
            .order("priority", { ascending: true })
            .order("queued_at", { ascending: true })
            .limit(parsed.limit);

          const ids = (pending ?? []).map((m) => m.id);
          if (ids.length) {
            await supabaseAdmin
              .from("mesh_messages")
              .update({ status: "delivering" })
              .in("id", ids);
          }
          await logUsage(200);
          return json({ ok: true, messages: pending ?? [] });
        }

        // ack
        const { error } = await supabaseAdmin
          .from("mesh_messages")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .in("id", parsed.ids)
          .eq("license_id", license.id);
        if (error) return json({ error: "ack_failed" }, 500);
        await logUsage(200);
        return json({ ok: true, delivered: parsed.ids.length });
      },
    },
  },
});
