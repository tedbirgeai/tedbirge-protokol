/**
 * Yerel doğrulama sonrası bulut eşleşmesi (yalnızca internet varken).
 * ------------------------------------------------------------------
 * Doğrulama cihazda (TOTP) yapılır; bu fonksiyon sadece numaraya bağlı
 * kalıcı hesabı hazırlayarak rehber eşleştirmenin çalışmasını sağlar.
 * İnternet yokken hiç çağrılmaz — uygulama tamamen yerel çalışır.
 *
 * KVKK: numara yalnızca hesap kimliği olarak tutulur, dizinde SHA-256
 * özeti kullanılır.
 */
import { createServerFn } from "@tanstack/react-start";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

const LinkInput = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,15}$/),
});

function phoneHash(e164: string): string {
  return createHash("sha256").update(`tedbirge/phone/v1:${e164}`).digest("hex");
}

/** Numaraya bağlı kalıcı hesabı hazırlar ve tek kullanımlık giriş bilgisi döndürür. */
export const linkPhoneAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LinkInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Kötüye kullanımı sınırlamak için numara başına 60 saniyede bir istek.
    const ph = phoneHash(data.phone);
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("id")
      .eq("phone_hash", ph)
      .gt("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      return { ok: false as const, reason: "rate-limited" as const };
    }
    await supabaseAdmin.from("phone_otp_codes").insert({
      phone_hash: ph,
      code_hash: createHash("sha256").update(randomUUID()).digest("hex"),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      consumed_at: new Date().toISOString(),
    });

    const email = `${data.phone.replace(/\D/g, "")}@phone.tedbirge.app`;
    const password = randomUUID() + randomUUID();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone: data.phone,
      password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (createError || !created?.user) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find(
        (u) => u.email === email || u.phone === data.phone.replace("+", ""),
      );
      if (!existing) {
        console.error("[local-auth] account creation failed", createError?.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email,
        email_confirm: true,
      });
      if (updateError) {
        console.error("[local-auth] account update failed", updateError.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
    }

    return { ok: true as const, email, password };
  });
