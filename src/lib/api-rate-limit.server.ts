import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Telemetri/API uç noktaları için sabit pencereli ad-hoc hız sınırı.
 * Platformda hazır bir rate-limit bileşeni olmadığı için sayaç veritabanında tutulur.
 */
const WINDOW_MINUTES = 1;
const WINDOW_LIMIT = 60; // istek / dakika / lisans
const DAILY_LIMIT = 20_000; // istek / gün / lisans

export type ApiRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; message: string };

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function floorTo(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

async function bump(clientHash: string, windowStart: Date, limit: number) {
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
    return true;
  }
  if (data.request_count >= limit) return false;

  await supabaseAdmin
    .from("ai_chat_usage")
    .update({ request_count: data.request_count + 1 })
    .eq("id", data.id);
  return true;
}

export type ApiRateLimitOptions = {
  /** Dakikalık tavan (varsayılan 60). */
  perMinute?: number;
  /** Günlük tavan (varsayılan 20.000). */
  perDay?: number;
};

export async function checkApiRateLimit(
  scope: string,
  key: string,
  options: ApiRateLimitOptions = {},
): Promise<ApiRateLimitResult> {
  const perMinute = options.perMinute ?? WINDOW_LIMIT;
  const perDay = options.perDay ?? DAILY_LIMIT;
  try {
    const hash = await sha256Hex(`${scope}:${key}`);
    const now = new Date();

    if (!(await bump(`api:${hash}`, floorTo(now, WINDOW_MINUTES), perMinute))) {
      return {
        ok: false,
        retryAfterSeconds: WINDOW_MINUTES * 60,
        message: `rate_limited: dakikada en fazla ${perMinute} istek gönderebilirsiniz.`,
      };
    }

    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (!(await bump(`api:${hash}:day`, dayStart, perDay))) {
      return {
        ok: false,
        retryAfterSeconds: 3600,
        message: "rate_limited: günlük istek kotası doldu.",
      };
    }


    return { ok: true };
  } catch (error) {
    console.error("[api-rate-limit] failed open", error);
    return { ok: true };
  }
}
