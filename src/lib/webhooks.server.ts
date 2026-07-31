import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Müşteri tanımlı webhook uç noktalarına imzalı bildirim gönderir.
 * İmza: x-tedbirge-signature: sha256=<hex(HMAC(secret, body))>
 */

export type WebhookEventType =
  | "license_event"
  | "field_report"
  | "device_offline"
  | "rate_limited"
  | "ir_alarm";

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deliver(
  endpoint: { id: string; user_id: string; url: string; secret: string },
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify({
    type: eventType,
    sent_at: new Date().toISOString(),
    data: payload,
  });

  let responseCode: number | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tedbirge-event": eventType,
        "x-tedbirge-signature": `sha256=${await hmacHex(endpoint.secret, body)}`,
      },
      body,
    });
    responseCode = response.status;
    if (!response.ok) error = (await response.text()).slice(0, 300);
  } catch (err) {
    error = err instanceof Error ? err.message.slice(0, 300) : "bilinmeyen hata";
  }

  await supabaseAdmin.from("webhook_deliveries").insert({
    endpoint_id: endpoint.id,
    user_id: endpoint.user_id,
    event_type: eventType,
    payload: payload as never,
    response_code: responseCode,
    error,
  });

  await supabaseAdmin
    .from("webhook_endpoints")
    .update({ last_status: responseCode, last_delivery_at: new Date().toISOString() })
    .eq("id", endpoint.id);

  return { ok: responseCode !== null && responseCode < 400, responseCode, error };
}

/** Bir kullanıcının aktif ve ilgili olaya abone uç noktalarına bildirim yayar. */
export async function dispatchWebhook(
  userId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: endpoints } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("id, user_id, url, secret, events")
      .eq("user_id", userId)
      .eq("active", true);

    if (!endpoints?.length) return;

    await Promise.all(
      endpoints
        .filter((e) => (e.events as string[]).includes(eventType))
        .map((e) => deliver(e, eventType, payload)),
    );
  } catch (err) {
    // Bildirim hatası ana işlemi bozmaz.
    console.error("[webhook] dispatch failed", err);
  }
}

/** Panelden tetiklenen tek seferlik test gönderimi. */
export async function sendTestWebhook(endpointId: string, userId: string) {
  const { data: endpoint } = await supabaseAdmin
    .from("webhook_endpoints")
    .select("id, user_id, url, secret")
    .eq("id", endpointId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!endpoint) throw new Error("Webhook adresi bulunamadı.");

  return deliver(endpoint, "license_event", {
    test: true,
    event: "webhook_test",
    detail: "Tedbirge Protokol test bildirimi",
  });
}
