import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LeadStatus = "new" | "contacted" | "pilot" | "won" | "lost";

export const LEAD_STATUS_MESSAGES: Record<LeadStatus, string> = {
  new: "Talebiniz alındı, ön değerlendirmeye girdi.",
  contacted: "Ekibimiz sizinle iletişime geçti; teklif/başvuru paketi hazırlanıyor.",
  pilot: "Pilot süreciniz başlatıldı. Kanıt taşıma panosundan belgeleri yükleyebilirsiniz.",
  won: "Pilot süreciniz olumlu tamamlandı; kurulum ve lisanslama adımına geçildi.",
  lost: "Talebiniz şimdilik kapatıldı. Dilediğiniz zaman yeniden başvurabilirsiniz.",
};

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

type NotifyInput = {
  leadId: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  lead: {
    email: string | null;
    phone: string | null;
    contact_name: string | null;
    organization: string | null;
  };
};

/**
 * Durum değişimini olay tablosuna yazar ve yapılandırılmışsa imzalı bir
 * webhook gönderir (e-posta/SMS gönderimi dış sisteme bırakılır).
 * LEAD_WEBHOOK_URL tanımlı değilse olay "skipped" olarak kaydedilir.
 */
export async function notifyLeadStatus(input: NotifyInput): Promise<void> {
  const message =
    LEAD_STATUS_MESSAGES[input.toStatus as LeadStatus] ?? "Talebinizin durumu güncellendi.";

  const { data: event } = await supabaseAdmin
    .from("ai_lead_events")
    .insert({
      lead_id: input.leadId,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      note: input.note ?? message,
      channel: "webhook",
      delivery_status: "pending",
    })
    .select("id")
    .single();

  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) {
    if (event) {
      await supabaseAdmin
        .from("ai_lead_events")
        .update({ delivery_status: "skipped", response_body: "LEAD_WEBHOOK_URL tanımlı değil" })
        .eq("id", event.id);
    }
    return;
  }

  const body = JSON.stringify({
    type: "ai_lead.status_changed",
    lead_id: input.leadId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    message,
    note: input.note ?? null,
    recipient: {
      email: input.lead.email,
      phone: input.lead.phone,
      name: input.lead.contact_name,
      organization: input.lead.organization,
    },
    sent_at: new Date().toISOString(),
  });

  const headers: Record<string, string> = { "content-type": "application/json" };
  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (secret) headers["x-tedbirge-signature"] = `sha256=${await hmacHex(secret, body)}`;

  try {
    const response = await fetch(url, { method: "POST", headers, body });
    const text = (await response.text()).slice(0, 500);
    if (event) {
      await supabaseAdmin
        .from("ai_lead_events")
        .update({
          delivery_status: response.ok ? "delivered" : "failed",
          response_code: response.status,
          response_body: text,
        })
        .eq("id", event.id);
    }
  } catch (error) {
    console.error("[lead-webhook] failed", error);
    if (event) {
      await supabaseAdmin
        .from("ai_lead_events")
        .update({
          delivery_status: "failed",
          response_body: error instanceof Error ? error.message.slice(0, 500) : "bilinmeyen hata",
        })
        .eq("id", event.id);
    }
  }
}
