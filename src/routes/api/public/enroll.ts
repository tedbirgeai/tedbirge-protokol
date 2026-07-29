import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * QR ile düğüm kaydı (tek kullanımlık davet anahtarı).
 * Sahadaki cihaz / telefon QR'ı okur, kendi ECDH anahtar çiftini üretir ve
 * yalnızca GENEL anahtarını buraya gönderir. Karşılığında düğüm kimliği ve
 * lisans anahtarı döner. Davet tek kullanımlıktır ve süresi dolar.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Body = z.object({
  token: z.string().trim().min(8).max(64),
  public_key: z.string().trim().min(40).max(512).optional(),
  key_fingerprint: z.string().trim().max(64).optional(),
  firmware: z.string().trim().max(40).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/enroll")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ error: "invalid_body" }, 400);
        }

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const limit = await checkApiRateLimit("enroll", parsed.token);
        if (!limit.ok) {
          return json({ error: limit.message }, 429);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: enrollment } = await supabaseAdmin
          .from("node_enrollments")
          .select("*")
          .eq("token", parsed.token)
          .maybeSingle();
        if (!enrollment) return json({ error: "enrollment_not_found" }, 404);
        if (enrollment.status !== "pending") return json({ error: "enrollment_used" }, 409);
        if (new Date(enrollment.expires_at) < new Date()) {
          await supabaseAdmin
            .from("node_enrollments")
            .update({ status: "expired" })
            .eq("id", enrollment.id);
          return json({ error: "enrollment_expired" }, 410);
        }

        const { data: license } = await supabaseAdmin
          .from("licenses")
          .select("id, license_key, node_limit, status")
          .eq("id", enrollment.license_id)
          .maybeSingle();
        if (!license) return json({ error: "license_not_found" }, 404);

        const { count } = await supabaseAdmin
          .from("devices")
          .select("id", { count: "exact", head: true })
          .eq("license_id", license.id);
        if ((count ?? 0) >= license.node_limit) return json({ error: "node_limit_reached" }, 403);

        const { data: device, error } = await supabaseAdmin
          .from("devices")
          .insert({
            license_id: license.id,
            user_id: enrollment.user_id,
            node_id: enrollment.node_id,
            label: enrollment.label,
            region: enrollment.region,
            carrier: enrollment.carrier,
            role: enrollment.role,
            kind: enrollment.kind,
            status: "active",
            firmware: parsed.firmware ?? null,
            public_key: parsed.public_key ?? null,
            key_fingerprint: parsed.key_fingerprint ?? null,
            e2ee: Boolean(parsed.public_key),
            key_updated_at: parsed.public_key ? new Date().toISOString() : null,
          })
          .select("id, node_id, region, carrier, role")
          .single();
        if (error || !device) return json({ error: "device_create_failed" }, 500);

        await supabaseAdmin
          .from("node_enrollments")
          .update({
            status: "claimed",
            device_id: device.id,
            claimed_at: new Date().toISOString(),
            claimed_fingerprint: parsed.key_fingerprint ?? null,
          })
          .eq("id", enrollment.id);

        await supabaseAdmin.from("license_events").insert({
          license_id: license.id,
          user_id: enrollment.user_id,
          device_id: device.id,
          event: "node_enrolled_qr",
          detail: `${device.node_id} · QR ile kaydedildi${parsed.key_fingerprint ? ` · anahtar ${parsed.key_fingerprint}` : ""}`,
          actor: "customer",
        });

        const origin = new URL(request.url).origin;
        return json({
          ok: true,
          node_id: device.node_id,
          region: device.region,
          carrier: device.carrier,
          role: device.role,
          license_key: license.license_key,
          e2ee: Boolean(parsed.public_key),
          endpoints: {
            telemetry: `${origin}/api/public/telemetry`,
            queue: `${origin}/api/public/queue`,
          },
        });
      },
    },
  },
});
