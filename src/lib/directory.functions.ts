/**
 * Telefon dizini — numara EŞLEŞTİRME servisi.
 * ------------------------------------------------------------------
 * KVKK/GDPR: Ham telefon numarası hiçbir zaman saklanmaz. Yalnızca
 * numaranın geri döndürülemez SHA-256 özeti tutulur ve eşleştirme bu
 * özet üzerinden yapılır. Kullanıcının kendi numarası da sunucu
 * tarafındaki doğrulanmış oturumdan okunur; istemcinin beyanına
 * güvenilmez (başkasının numarasını sahiplenme engellenir).
 */
import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SyncInput = z.object({
  personId: z.string().min(4).max(64),
  nodeId: z.string().min(3).max(80),
  displayName: z.string().max(60).optional(),
});

const MatchInput = z.object({
  hashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(500),
});

function hashPhone(e164: string): string {
  return createHash("sha256").update(`tedbirge/phone/v1:${e164}`).digest("hex");
}

/**
 * Kendi kaydını dizine yazar/günceller. Numara oturumdan alınır.
 * ÇOK CİHAZ: her cihaz (node_id) ayrı satırdır; telefon, masaüstü ve
 * tablet aynı numara altında birlikte durur — arama hangisi açıksa
 * oraya düşer.
 */
export const syncMyDirectoryEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SyncInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: userData } = await context.supabase.auth.getUser();
    const phone = userData.user?.phone?.trim();
    if (!phone) return { ok: false as const, reason: "no-phone" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("phone_accounts").upsert(
      {
        user_id: context.userId,
        phone_hash: hashPhone(phone.startsWith("+") ? phone : `+${phone}`),
        person_id: data.personId,
        node_id: data.nodeId,
        display_name: data.displayName?.slice(0, 60) ?? null,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,node_id" },
    );
    if (error) {
      console.error("[directory] upsert failed", error.message);
      return { ok: false as const, reason: "write-failed" as const };
    }
    return { ok: true as const };
  });

/** Telefon özetlerini Tedbirge kullanıcılarıyla eşleştirir. */
export const matchDirectoryContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.hashes.length === 0) return { matches: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("phone_accounts")
      .select("phone_hash, person_id, node_id, display_name, user_id")
      .in("phone_hash", data.hashes);
    if (error) {
      console.error("[directory] match failed", error.message);
      return { matches: [] };
    }
    return {
      matches: (rows ?? [])
        .filter((r) => r.user_id !== context.userId)
        .map((r) => ({
          hash: r.phone_hash,
          personId: r.person_id,
          nodeId: r.node_id,
          displayName: r.display_name,
        })),
    };
  });
