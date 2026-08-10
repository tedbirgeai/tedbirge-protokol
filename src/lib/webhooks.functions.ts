import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = [
  "license_event",
  "field_report",
  "device_offline",
  "rate_limited",
  "ir_alarm",
] as const;

const SaveInput = z.object({
  id: z.string().uuid().optional(),
  url: z.string().trim().url().startsWith("https://").max(500),
  events: z.array(z.enum(EVENTS)).min(1),
  active: z.boolean().default(true),
});

/** Webhook adresini kaydeder veya günceller; imza anahtarı sunucuda üretilir. */
export const saveWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id) {
      const { data: existing } = await supabaseAdmin
        .from("webhook_endpoints")
        .select("id, user_id")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing || existing.user_id !== context.userId) {
        throw new Error("Webhook adresi bulunamadı.");
      }
      const { error } = await supabaseAdmin
        .from("webhook_endpoints")
        .update({ url: data.url, events: data.events, active: data.active })
        .eq("id", data.id);
      if (error) throw new Error("Webhook güncellenemedi.");
      return { ok: true, id: data.id };
    }

    const { data: created, error } = await supabaseAdmin
      .from("webhook_endpoints")
      .insert({
        user_id: context.userId,
        url: data.url,
        events: data.events,
        active: data.active,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error("Webhook kaydedilemedi.");
    return { ok: true, id: created.id };
  });

/** Webhook adresini siler. */
export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("webhook_endpoints")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** İmza anahtarını sahibine tek seferlik gösterir. */
export const revealWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("secret, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Webhook adresi bulunamadı.");
    return { secret: row.secret };
  });

/** Test bildirimi gönderir ve sonucu döner. */
export const testWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { sendTestWebhook } = await import("@/lib/webhooks.server");
    return sendTestWebhook(data.id, context.userId);
  });
