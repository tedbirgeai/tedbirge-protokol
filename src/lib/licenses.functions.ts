import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LicenseInput = z.object({ licenseId: z.string().uuid() });

/** Lisans anahtarını yeniden üretir; eski anahtarla gelen düğümler reddedilir. */
export const rotateLicenseKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LicenseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: license } = await context.supabase
      .from("licenses")
      .select("id, user_id")
      .eq("id", data.licenseId)
      .maybeSingle();

    if (!license || license.user_id !== context.userId) {
      throw new Error("Lisans bulunamadı.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const newKey = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ license_key: newKey })
      .eq("id", license.id);
    if (error) throw new Error("Anahtar yenilenemedi.");

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      event: "license_key_rotated",
      detail: "Lisans anahtarı yenilendi; eski anahtar geçersiz.",
      actor: "customer",
    });

    return { ok: true, licenseKey: newKey };

  });

/**
 * Düğüm şifreleme anahtarlarını iptal eder (anahtar rotasyonu).
 * Açık anahtar ve parmak izi silinir; düğüm yeni QR daveti ile kendi
 * yeni anahtar çiftini üretip yeniden kaydolmak zorundadır.
 */
export const rotateDeviceKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ licenseId: z.string().uuid(), deviceId: z.string().uuid().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: license } = await context.supabase
      .from("licenses")
      .select("id, user_id")
      .eq("id", data.licenseId)
      .maybeSingle();

    if (!license || license.user_id !== context.userId) {
      throw new Error("Lisans bulunamadı.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("devices")
      .update({ public_key: null, key_fingerprint: null, key_updated_at: new Date().toISOString() })
      .eq("license_id", license.id);
    if (data.deviceId) query = query.eq("id", data.deviceId);

    const { data: rows, error } = await query.select("id");
    if (error) throw new Error("Anahtarlar iptal edilemedi.");

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      device_id: data.deviceId ?? null,
      event: "device_keys_rotated",
      detail: `${rows?.length ?? 0} düğümün şifreleme anahtarı iptal edildi; yeniden kayıt gerekiyor.`,
      actor: "customer",
    });

    return { ok: true, rotated: rows?.length ?? 0 };
  });

/** Anahtar rotasyon geçmişi (lisans ve düğüm anahtarları). */
export const listKeyRotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("license_events")
      .select("id, license_id, event, detail, created_at")
      .in("event", ["license_key_rotated", "device_keys_rotated"])
      .order("created_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });
