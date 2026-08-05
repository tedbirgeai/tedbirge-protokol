/**
 * Şifreli sohbet geçmişi paketleri — cihazlar arası eşitleme deposu.
 * ------------------------------------------------------------------
 * Sunucu yalnızca uçtan uca şifreli (AES-GCM) metni saklar; anahtar
 * kullanıcının numarasından türetilir ve hiçbir zaman sunucuya çıkmaz.
 * Paketler artımlıdır (delta): her cihaz yalnızca değişenleri yazar,
 * diğer cihazlar son eşitleme damgasından sonrasını okur.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PushInput = z.object({
  deviceId: z.string().min(3).max(80),
  ciphertext: z.string().min(16).max(900_000),
});

const PullInput = z.object({
  since: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

/** En fazla saklanan paket sayısı (kota koruması). */
const MAX_CHUNKS = 300;

export const pushHistoryChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PushInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("history_chunks").insert({
      user_id: context.userId,
      device_id: data.deviceId,
      ciphertext: data.ciphertext,
      byte_size: data.ciphertext.length,
    });
    if (error) {
      console.error("[history] push failed", error.message);
      return { ok: false as const, error: error.message };
    }

    // Kota koruması: en eski paketler budanır.
    const { data: rows } = await context.supabase
      .from("history_chunks")
      .select("id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(MAX_CHUNKS, MAX_CHUNKS + 200);
    const stale = (rows ?? []).map((r) => r.id as string);
    if (stale.length > 0) {
      await context.supabase.from("history_chunks").delete().in("id", stale);
    }
    return { ok: true as const, error: null as string | null };
  });

export const pullHistoryChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PullInput.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("history_chunks")
      .select("id, device_id, ciphertext, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 60);
    if (data.since) query = query.gt("created_at", data.since);

    const { data: rows, error } = await query;
    if (error) {
      console.error("[history] pull failed", error.message);
      return { chunks: [], error: error.message };
    }
    return {
      chunks: (rows ?? []).map((r) => ({
        id: r.id as string,
        deviceId: r.device_id as string,
        ciphertext: r.ciphertext as string,
        createdAt: r.created_at as string,
      })),
      error: null as string | null,
    };
  });

export const historyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("history_chunks")
      .select("byte_size, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(MAX_CHUNKS);
    if (error) {
      console.error("[history] stats failed", error.message);
      return { chunks: 0, bytes: 0, newestAt: null as string | null, error: error.message };
    }
    const list = rows ?? [];
    return {
      chunks: list.length,
      bytes: list.reduce((sum, r) => sum + Number(r.byte_size ?? 0), 0),
      newestAt: (list[0]?.created_at as string | undefined) ?? null,
      error: null as string | null,
    };
  });
