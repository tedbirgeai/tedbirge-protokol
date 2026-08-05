/**
 * Rehber kasası — şifreli yedek saklama.
 * Sunucu yalnızca çözülemez şifreli metni tutar; içeriği okuyamaz.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({ ciphertext: z.string().min(16).max(400_000) });

export const saveContactVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contact_vaults").upsert(
      {
        user_id: context.userId,
        ciphertext: data.ciphertext,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      console.error("[vault] save failed", error.message);
      return { ok: false as const };
    }
    return { ok: true as const };
  });

export const loadContactVault = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("contact_vaults")
      .select("ciphertext")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[vault] load failed", error.message);
      return { ciphertext: null as string | null };
    }
    return { ciphertext: (data?.ciphertext as string | undefined) ?? null };
  });
