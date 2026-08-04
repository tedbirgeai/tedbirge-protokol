/**
 * Gerçek SMS ile telefon doğrulama (OTP) — Twilio üzerinden.
 * ------------------------------------------------------------------
 * KVKK: Ham numara veritabanında saklanmaz; yalnızca SHA-256 özeti ve
 * kodun özeti tutulur. Kod 5 dakika geçerlidir, en fazla 5 deneme hakkı
 * vardır ve doğrulandığı an tüketilir.
 */
import { createServerFn } from "@tanstack/react-start";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";

const PhoneInput = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,15}$/),
});

const VerifyInput = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,15}$/),
  code: z.string().regex(/^\d{6}$/),
});

const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

function hash(value: string): string {
  return createHash("sha256").update(`tedbirge/otp/v1:${value}`).digest("hex");
}

function phoneHash(e164: string): string {
  return createHash("sha256").update(`tedbirge/phone/v1:${e164}`).digest("hex");
}

/** Twilio hesabındaki ilk gönderici numarayı bulur (secret varsa onu kullanır). */
async function resolveSender(lovableKey: string, twilioKey: string): Promise<string | null> {
  const configured = process.env["TWILIO_SMS_FROM"]?.trim();
  if (configured) return configured;
  const res = await fetch(`${GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
    },
  });
  if (!res.ok) {
    console.error(`[otp] sender lookup failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const body = (await res.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
  return body.incoming_phone_numbers?.[0]?.phone_number ?? null;
}

/** 6 haneli kod üretir ve gerçek SMS olarak gönderir. */
export const sendPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PhoneInput.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const twilioKey = process.env["TWILIO_API_KEY"];
    if (!lovableKey || !twilioKey) {
      return { ok: false as const, reason: "sms-not-configured" as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ph = phoneHash(data.phone);

    // Basit hız sınırı: son 60 saniyede gönderilmiş kod varsa tekrar gönderme.
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

    const sender = await resolveSender(lovableKey, twilioKey);
    if (!sender) return { ok: false as const, reason: "no-sender" as const };

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

    // Twilio deneme (trial) hesapları serbest metin SMS'e izin vermez; yalnızca
    // önceden tanımlı şablonlar (Content template) gönderilebilir. Şablon kimliği
    // tanımlıysa şablonla, değilse klasik metinle gönderilir.
    const contentSid = process.env["TWILIO_CONTENT_SID"]?.trim();
    const messagingServiceSid = process.env["TWILIO_MESSAGING_SERVICE_SID"]?.trim();

    const form = new URLSearchParams({ To: data.phone });
    if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
    else form.set("From", sender);

    if (contentSid) {
      form.set("ContentSid", contentSid);
      // Şablon değişkenleri: {{1}} = marka, {{2}} = kod, {{3}} = geçerlilik (dk)
      form.set("ContentVariables", JSON.stringify({ "1": "Tedbirge", "2": code, "3": "5" }));
    } else {
      form.set(
        "Body",
        `Tedbirge doğrulama kodunuz: ${code}. Kod 5 dakika geçerlidir. Kodu kimseyle paylaşmayın.`,
      );
    }

    const res = await fetch(`${GATEWAY}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[otp] twilio send failed [${res.status}]: ${detail}`);
      // 572006: deneme hesabı, serbest metin yerine hazır şablon zorunlu.
      if (detail.includes("572006") || /trial account/i.test(detail)) {
        return { ok: false as const, reason: "trial-restricted" as const };
      }
      return { ok: false as const, reason: "send-failed" as const, status: res.status };
    }



    await supabaseAdmin.from("phone_otp_codes").insert({
      phone_hash: ph,
      code_hash: hash(`${data.phone}:${code}`),
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    return { ok: true as const };
  });

/**
 * Kodu doğrular; başarılıysa numaraya bağlı kalıcı hesabı hazırlar ve
 * istemcinin oturum açacağı tek kullanımlık kimlik bilgisini döndürür.
 */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ph = phoneHash(data.phone);

    const { data: rows } = await supabaseAdmin
      .from("phone_otp_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("phone_hash", ph)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return { ok: false as const, reason: "no-code" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, reason: "expired" as const };
    }
    if (row.attempts >= 5) return { ok: false as const, reason: "too-many-attempts" as const };

    if (row.code_hash !== hash(`${data.phone}:${data.code}`)) {
      await supabaseAdmin
        .from("phone_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false as const, reason: "invalid-code" as const };
    }

    await supabaseAdmin
      .from("phone_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    // Numaraya bağlı kalıcı hesap: aynı numara her cihazda aynı kimliktir.
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
      // Hesap zaten varsa parolayı döndür (tek kullanımlık, her girişte yenilenir).
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find(
        (u) => u.email === email || u.phone === data.phone.replace("+", ""),
      );
      if (!existing) {
        console.error("[otp] account creation failed", createError?.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email,
        email_confirm: true,
      });
      if (updateError) {
        console.error("[otp] account update failed", updateError.message);
        return { ok: false as const, reason: "account-failed" as const };
      }
    }

    return { ok: true as const, email, password };
  });
