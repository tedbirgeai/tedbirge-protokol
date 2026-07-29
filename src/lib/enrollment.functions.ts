import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  licenseId: z.string().uuid(),
  nodeId: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-zA-Z0-9-]+$/, "Sadece harf, rakam ve tire kullanın."),
  label: z.string().trim().max(80).optional(),
  region: z.enum(["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"]).default("TR"),
  carrier: z
    .enum(["lora", "halow", "tvws", "wifi", "wigig", "fso", "cellular", "satellite", "eth"])
    .default("lora"),
  role: z.enum(["gateway", "relay", "edge"]).default("edge"),
  ttlMinutes: z.number().int().min(5).max(180).default(30),
});

/** QR ile düğüm eklemek için tek kullanımlık davet üretir. */
export const createNodeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { newEnrollmentToken } = await import("@/lib/enrollment.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await context.supabase
      .from("licenses")
      .select("id, user_id, node_limit")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license || license.user_id !== context.userId) throw new Error("Lisans bulunamadı.");

    const { count } = await supabaseAdmin
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("license_id", license.id);
    if ((count ?? 0) >= license.node_limit) {
      throw new Error(`Lisans limiti dolu (${license.node_limit} düğüm).`);
    }

    const { data: clash } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("license_id", license.id)
      .eq("node_id", data.nodeId)
      .maybeSingle();
    if (clash) throw new Error("Bu düğüm adı zaten kayıtlı.");

    const token = newEnrollmentToken();
    const expiresAt = new Date(Date.now() + data.ttlMinutes * 60_000).toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("node_enrollments")
      .insert({
        license_id: license.id,
        user_id: context.userId,
        token,
        node_id: data.nodeId,
        label: data.label ?? null,
        region: data.region,
        carrier: data.carrier,
        role: data.role,
        expires_at: expiresAt,
      })
      .select("id, token, node_id, expires_at")
      .single();
    if (error || !row) throw new Error("Davet oluşturulamadı.");

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      event: "enrollment_created",
      detail: `${data.nodeId} · QR daveti (${data.ttlMinutes} dk)`,
      actor: "customer",
    });

    return { id: row.id, token: row.token, nodeId: row.node_id, expiresAt: row.expires_at };
  });

/** Kullanılmamış daveti iptal eder. */
export const revokeNodeEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await context.supabase
      .from("node_enrollments")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Davet bulunamadı.");
    if (row.status !== "pending") throw new Error("Bu davet zaten kullanılmış.");
    const { error } = await supabaseAdmin
      .from("node_enrollments")
      .update({ status: "revoked" })
      .eq("id", row.id);
    if (error) throw new Error("Davet iptal edilemedi.");
    return { ok: true };
  });

/** Bir düğüm için uçtan uca şifreleme zorunluluğunu açar/kapatır. */
export const setDeviceE2ee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ deviceId: z.string().uuid(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device } = await context.supabase
      .from("devices")
      .select("id, user_id, license_id, node_id, public_key")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (!device || device.user_id !== context.userId) throw new Error("Düğüm bulunamadı.");
    if (data.enabled && !device.public_key) {
      throw new Error("Bu düğümün genel anahtarı yok. Önce QR ile anahtar üretin.");
    }
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ e2ee: data.enabled })
      .eq("id", device.id);
    if (error) throw new Error("Şifreleme ayarı güncellenemedi.");

    await supabaseAdmin.from("license_events").insert({
      license_id: device.license_id,
      user_id: context.userId,
      device_id: device.id,
      event: data.enabled ? "e2ee_enabled" : "e2ee_disabled",
      detail: `${device.node_id} · uçtan uca şifreleme ${data.enabled ? "zorunlu" : "kapalı"}`,
      actor: "customer",
    });
    return { ok: true };
  });
