import { createFileRoute } from "@tanstack/react-router";

/**
 * Zamanlanmış çağrı: 15 dakikadır telemetri göndermeyen aktif düğümler için
 * "device_offline" webhook bildirimi üretir ve lisans olay günlüğüne yazar.
 * Kimlik: x-cron-secret başlığı.
 */

const OFFLINE_MINUTES = 15;

export const Route = createFileRoute("/api/public/cron/offline-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { dispatchWebhook } = await import("@/lib/webhooks.server");

        const threshold = new Date(Date.now() - OFFLINE_MINUTES * 60_000).toISOString();

        const { data: devices } = await supabaseAdmin
          .from("devices")
          .select("id, user_id, license_id, node_id, last_seen_at")
          .eq("status", "active")
          .not("last_seen_at", "is", null)
          .lt("last_seen_at", threshold)
          .limit(500);

        if (!devices?.length) return Response.json({ ok: true, offline: 0 });

        // Aynı kesinti için tekrar bildirim göndermemek adına son olay kontrol edilir.
        let notified = 0;
        for (const device of devices) {
          const { data: last } = await supabaseAdmin
            .from("license_events")
            .select("created_at")
            .eq("device_id", device.id)
            .eq("event", "device_offline")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (last && device.last_seen_at && last.created_at > device.last_seen_at) continue;

          await supabaseAdmin.from("license_events").insert({
            license_id: device.license_id,
            user_id: device.user_id,
            device_id: device.id,
            event: "device_offline",
            detail: `${device.node_id} · ${OFFLINE_MINUTES} dakikadır telemetri yok`,
            actor: "system",
          });

          if (device.user_id) {
            await dispatchWebhook(device.user_id, "device_offline", {
              device_id: device.id,
              license_id: device.license_id,
              node_id: device.node_id,
              last_seen_at: device.last_seen_at,
            });
          }
          notified += 1;
        }

        return Response.json({ ok: true, offline: devices.length, notified });
      },
    },
  },
});
