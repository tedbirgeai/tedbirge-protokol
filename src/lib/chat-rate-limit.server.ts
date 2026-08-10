import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WINDOW_MINUTES = 5;
const WINDOW_LIMIT = 20; // istek / 5 dakika
const DAILY_LIMIT = 200; // istek / gün

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; message: string };

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function floorTo(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

async function bump(
  clientHash: string,
  windowStart: Date,
  limit: number,
): Promise<{ allowed: boolean; count: number }> {
  const iso = windowStart.toISOString();
  const { data } = await supabaseAdmin
    .from("ai_chat_usage")
    .select("id, request_count")
    .eq("client_hash", clientHash)
    .eq("window_start", iso)
    .maybeSingle();

  if (!data) {
    await supabaseAdmin
      .from("ai_chat_usage")
      .insert({ client_hash: clientHash, window_start: iso, request_count: 1 });
    return { allowed: true, count: 1 };
  }

  if (data.request_count >= limit) return { allowed: false, count: data.request_count };

  await supabaseAdmin
    .from("ai_chat_usage")
    .update({ request_count: data.request_count + 1 })
    .eq("id", data.id);

  return { allowed: true, count: data.request_count + 1 };
}

/**
 * Platformda hazır bir rate-limit bileşeni olmadığı için IP karması bazlı
 * ad-hoc bir sayaç kullanılır (kayan pencere değil, sabit pencere).
 */
export async function checkChatRateLimit(request: Request): Promise<RateLimitResult> {
  try {
    const hash = await sha256(`tedbirge:${clientIp(request)}`);
    const now = new Date();

    const short = await bump(hash, floorTo(now, WINDOW_MINUTES), WINDOW_LIMIT);
    if (!short.allowed) {
      return {
        ok: false,
        retryAfterSeconds: WINDOW_MINUTES * 60,
        message: `Çok fazla mesaj gönderildi. ${WINDOW_MINUTES} dakika sonra tekrar deneyin veya pilot formunu kullanın.`,
      };
    }

    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daily = await bump(`${hash}:day`, dayStart, DAILY_LIMIT);
    if (!daily.allowed) {
      return {
        ok: false,
        retryAfterSeconds: 3600,
        message:
          "Günlük danışman kotası doldu. Lütfen /iletisim adresindeki pilot formu ile devam edin.",
      };
    }

    return { ok: true };
  } catch (error) {
    // Sayaç arızası sohbeti kesmemeli.
    console.error("[rate-limit] failed open", error);
    return { ok: true };
  }
}
