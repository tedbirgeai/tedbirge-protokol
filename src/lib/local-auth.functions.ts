/**
 * Yerel doğrulama sonrası bulut eşleşmesi (yalnızca internet varken).
 * ------------------------------------------------------------------
 * Doğrulama cihazda (TOTP) yapılır; bu fonksiyon sadece numaraya bağlı
 * kalıcı hesabı hazırlayarak rehber eşleştirmenin çalışmasını sağlar.
 * İnternet yokken hiç çağrılmaz — uygulama tamamen yerel çalışır.
 *
 * İDEMPOTENT: Parola numaradan ve sunucu gizli anahtarından deterministik
 * türetilir. Böylece ikinci bir ortamda giriş yapmak, telefondaki veya
 * masaüstündeki mevcut oturumu DÜŞÜRMEZ (WhatsApp bağlı-cihaz modeli).
 *
 * KVKK: numara yalnızca hesap kimliği olarak tutulur, dizinde SHA-256
 * özeti kullanılır.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deriveAccountPassword } from "@/lib/local-auth.server";

/** Numaraya bağlı kalıcı hesabı hazırlar ve tek kullanımlık giriş bilgisi döndürür. */
export const linkPhoneAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ phone: z.string().regex(/^\+[1-9]\d{7,15}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const pepper = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_URL"] ?? "";
    if (!pepper) return { ok: false as const, reason: "account-failed" as const };

    const email = `${data.phone.replace(/\D/g, "")}@phone.tedbirge.app`;
    const password = deriveAccountPassword(data.phone, pepper);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone: data.phone,
      password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (createError || !created?.user) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email === email);
      if (!existing) {
        console.error("[local-auth] account creation failed", createError?.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
      // Sunucu anahtarı yenilenmiş olsa bile hesap erişilebilir kalır. Parola
      // güncellemesi mevcut cihaz oturumlarını düşürmez; yeni cihazı aynı hesaba bağlar.
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        email,
        password,
        email_confirm: true,
        phone_confirm: true,
      });
      if (updateError) {
        console.error("[local-auth] account update failed", updateError.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
    }

    return { ok: true as const, email, password };
  });
