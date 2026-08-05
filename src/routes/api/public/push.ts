/**
 * Bildirim aboneliği uç noktası.
 * ------------------------------------------------------------------
 * GET  → tarayıcının abone olması için genel VAPID anahtarını verir.
 * POST → subscribe / unsubscribe / notify
 *
 * Gizlilik: sunucuya mesaj içeriği hiçbir zaman gönderilmez. "notify"
 * yalnızca "bu düğüme yeni şifreli paket var" veya "gelen arama var"
 * sinyali taşır; metin alıcının cihazında üretilir.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const NodeId = z.string().trim().min(3).max(120);

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    nodeId: NodeId,
    endpoint: z.string().url().max(2000),
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(4).max(200),
  }),
  z.object({ action: z.literal("unsubscribe"), endpoint: z.string().url().max(2000) }),
  z.object({
    action: z.literal("native-subscribe"),
    nodeId: NodeId,
    token: z.string().trim().min(10).max(500),
    platform: z.enum(["ios", "android", "unknown"]).default("unknown"),
  }),
  z.object({
    action: z.literal("native-unsubscribe"),
    token: z.string().trim().min(10).max(500),
  }),
  z.object({
    action: z.literal("notify"),
    to: NodeId,
    kind: z.enum(["message", "call"]),
    peer: z.string().trim().max(60).optional(),
  }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function clientKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonim"
  );
}

export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      GET: async () => {
        const { vapidPublicKey } = await import("@/lib/web-push.server");
        const key = vapidPublicKey();
        return json({ ok: Boolean(key), publicKey: key });
      },
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ ok: false, error: "gecersiz_istek" }, 400);
        }

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const limit = await checkApiRateLimit("push", clientKey(request));
        if (!limit.ok) {
          return new Response(JSON.stringify({ ok: false, error: limit.message }), {
            status: 429,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
              "retry-after": String(limit.retryAfterSeconds),
            },
          });
        }

        const dispatch = await import("@/lib/push-dispatch.server");

        if (parsed.action === "subscribe") {
          const ok = await dispatch.registerPushSubscription(parsed);
          return json({ ok });
        }

        if (parsed.action === "native-subscribe") {
          const ok = await dispatch.registerNativeToken(parsed);
          return json({ ok });
        }

        if (parsed.action === "native-unsubscribe") {
          const ok = await dispatch.removeNativeToken(parsed.token);
          return json({ ok });
        }

        if (parsed.action === "unsubscribe") {
          const ok = await dispatch.removePushSubscription(parsed.endpoint);
          return json({ ok });
        }

        const sent = await dispatch.notifyNode(parsed.to, {
          kind: parsed.kind,
          title: parsed.kind === "call" ? "Gelen arama" : "Yeni mesaj",
          body:
            parsed.kind === "call"
              ? "Tedbirge üzerinden sizi arıyor."
              : "Şifreli yeni mesajınız var.",
          tag: parsed.kind === "call" ? "tedbirge-call" : "tedbirge-chat",
          url: "/chat",
          peer: parsed.peer,
        });
        return json({ ok: true, sent });
      },
    },
  },
});
