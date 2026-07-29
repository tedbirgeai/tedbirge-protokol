import { createFileRoute } from "@tanstack/react-router";

/**
 * Zamanlanmış çağrı: 15 dakikadır telemetri göndermeyen aktif düğümler için
 * katman bazlı (gateway / relay / edge) bağlantı alarmı üretir, otomatik
 * failover uygular ve "device_offline" webhook bildirimi gönderir.
 * Kimlik: x-cron-secret başlığı.
 */

const OFFLINE_MINUTES = 15;

export const Route = createFileRoute("/api/public/cron/offline-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Kimlik: x-cron-secret ya da zamanlayıcının gönderdiği apikey başlığı.
        const secret = process.env.CRON_SECRET;
        const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const bySecret = Boolean(secret) && request.headers.get("x-cron-secret") === secret;
        const byApiKey = Boolean(apiKey) && request.headers.get("apikey") === apiKey;
        if (!bySecret && !byApiKey) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { dispatchWebhook } = await import("@/lib/webhooks.server");

        const now = new Date();
        const threshold = new Date(now.getTime() - OFFLINE_MINUTES * 60_000).toISOString();

        const { data: devices } = await supabaseAdmin
          .from("devices")
          .select(
            "id, user_id, license_id, node_id, last_seen_at, role, failover_group, failover_priority, is_backup, active_uplink",
          )
          .eq("status", "active")
          .not("last_seen_at", "is", null)
          .lt("last_seen_at", threshold)
          .limit(500);

        if (!devices?.length) return Response.json({ ok: true, offline: 0, notified: 0, failover: 0 });

        let notified = 0;
        let failovers = 0;

        for (const device of devices) {
          // Aynı kesinti için tekrar alarm üretilmez.
          const { data: openAlert } = await supabaseAdmin
            .from("link_alerts")
            .select("id")
            .eq("device_id", device.id)
            .eq("state", "down")
            .is("resolved_at", null)
            .maybeSingle();
          if (openAlert) continue;

          // Otomatik failover: aynı grupta çevrimiçi, en yüksek öncelikli yedek devralır.
          let failoverTo: string | null = null;
          if (device.failover_group) {
            const { data: candidates } = await supabaseAdmin
              .from("devices")
              .select("id, node_id, last_seen_at, failover_priority, role")
              .eq("license_id", device.license_id)
              .eq("failover_group", device.failover_group)
              .eq("status", "active")
              .neq("id", device.id)
              .gte("last_seen_at", threshold)
              .order("failover_priority", { ascending: true })
              .limit(1);

            const takeover = candidates?.[0];
            if (takeover) {
              await supabaseAdmin
                .from("devices")
                .update({ active_uplink: true })
                .eq("id", takeover.id);
              failoverTo = takeover.node_id;
              failovers += 1;
            }
          }

          await supabaseAdmin.from("devices").update({ active_uplink: false }).eq("id", device.id);

          await supabaseAdmin.from("link_alerts").insert({
            license_id: device.license_id,
            user_id: device.user_id,
            device_id: device.id,
            node_id: device.node_id,
            layer: device.role ?? "edge",
            state: "down",
            detail: `${OFFLINE_MINUTES} dakikadır telemetri yok`,
            failover_to: failoverTo,
            detected_at: now.toISOString(),
          });

          // Kalıcı kesinti olay kaydı (süre, katman, devralan yedek).
          await supabaseAdmin.from("outage_events").insert({
            license_id: device.license_id,
            user_id: device.user_id,
            device_id: device.id,
            node_id: device.node_id,
            layer: device.role ?? "edge",
            started_at: device.last_seen_at ?? now.toISOString(),
            failover_to: failoverTo,
            cause: `${OFFLINE_MINUTES} dakikadır telemetri yok`,
            resolved: false,
          });

          await supabaseAdmin.from("license_events").insert({
            license_id: device.license_id,
            user_id: device.user_id,
            device_id: device.id,
            event: "device_offline",
            detail: `${device.node_id} · ${device.role ?? "edge"} katmanı düştü${
              failoverTo ? ` · devralan: ${failoverTo}` : ""
            }`,
            actor: "system",
          });

          if (device.user_id) {
            await dispatchWebhook(device.user_id, "device_offline", {
              device_id: device.id,
              license_id: device.license_id,
              node_id: device.node_id,
              layer: device.role ?? "edge",
              failover_to: failoverTo,
              last_seen_at: device.last_seen_at,
            });
          }
          notified += 1;
        }

        return Response.json({ ok: true, offline: devices.length, notified, failover: failovers });
      },
    },
  },
});
