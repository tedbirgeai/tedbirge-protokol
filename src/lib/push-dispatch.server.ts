/**
 * Düğüm bazlı bildirim dağıtımı.
 * ------------------------------------------------------------------
 * Kayıtlar yalnızca sunucu tarafından (service role) okunur; hiçbir
 * istemci başka bir cihazın abonelik adresini göremez.
 * Bildirim metni jeneriktir — içerik cihazda çözülür.
 */

import {
  sendWebPush,
  webPushConfigured,
  type PushNotificationPayload,
} from "@/lib/web-push.server";

export async function registerPushSubscription(input: {
  nodeId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      node_id: input.nodeId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      failure_count: 0,
      last_seen_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 90 * 86_400_000).toISOString(),
    },
    { onConflict: "endpoint" },
  );
  return !error;
}

export async function removePushSubscription(endpoint: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  return !error;
}

/** Hedef düğümün tüm cihazlarına jenerik bildirim yollar. */
export async function notifyNode(
  nodeId: string,
  payload: PushNotificationPayload,
): Promise<number> {
  if (!webPushConfigured()) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("node_id", nodeId)
    .gt("expires_at", new Date().toISOString())
    .limit(10);

  if (!data?.length) return 0;

  const results = await Promise.all(
    data.map(async (row) => {
      const res = await sendWebPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        payload,
      );
      if (res.gone) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", row.id);
      }
      return res.ok ? 1 : 0;
    }),
  );
  return results.reduce<number>((a, b) => a + b, 0);
}
