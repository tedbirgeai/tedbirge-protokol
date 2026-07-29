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
