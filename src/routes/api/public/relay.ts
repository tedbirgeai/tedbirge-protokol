/**
 * Bulut yedek röle (store-and-forward).
 * ------------------------------------------------------------------
 * Alıcı cihaz kapalıyken mesaj kaybolmasın diye ŞİFRELİ zarf geçici
 * olarak saklanır ve alıcı çevrimiçi olunca teslim edilir.
 *
 * Gizlilik: gövde X25519 + AES-256-GCM ile uçtan uca şifrelidir; sunucu
 * yalnızca yönlendirme başlığını (kimden/kime) görür, içeriği açamaz.
 * Zarf 14 gün sonra otomatik olarak düşer.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_ENVELOPE = 256 * 1024;
const MAX_PULL = 100;

const NodeId = z.string().trim().min(3).max(120);

const Body = z.union([
  z.object({
    action: z.literal("publish"),
    nodeId: NodeId,
    signPublic: z.string().min(10).max(500),
    boxPublic: z.string().min(10).max(500),
  }),
  z.object({ action: z.literal("lookup"), nodeId: NodeId }),
  z.object({
    action: z.literal("push"),
    items: z
      .array(
        z.object({
          pktId: z.string().min(4).max(200),
          to: NodeId,
          from: NodeId,
          envelope: z.string().min(10).max(MAX_ENVELOPE),
          priority: z.number().int().min(0).max(3).default(2),
        }),
      )
      .min(1)
      .max(50),
  }),
  z.object({
    action: z.literal("pull"),
    nodeId: NodeId,
    ack: z.array(z.string().max(200)).max(MAX_PULL).default([]),
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

export const Route = createFileRoute("/api/public/relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ ok: false, error: "gecersiz_istek" }, 400);
        }

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const limit = await checkApiRateLimit("relay", clientKey(request));
        if (!limit.ok) {
          return json({ ok: false, error: limit.message }, 429);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (parsed.action === "publish") {
          const { error } = await supabaseAdmin.from("relay_directory").upsert(
            {
              node_id: parsed.nodeId,
              sign_public: parsed.signPublic,
              box_public: parsed.boxPublic,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "node_id" },
          );
          if (error) return json({ ok: false, error: "kayit_hatasi" }, 500);
          return json({ ok: true });
        }

        if (parsed.action === "lookup") {
          const { data } = await supabaseAdmin
            .from("relay_directory")
            .select("node_id, sign_public, box_public")
            .eq("node_id", parsed.nodeId)
            .maybeSingle();
          if (!data) return json({ ok: true, found: false });
          return json({
            ok: true,
            found: true,
            nodeId: data.node_id,
            signPublic: data.sign_public,
            boxPublic: data.box_public,
          });
        }

        if (parsed.action === "push") {
          const rows = parsed.items.map((i) => ({
            pkt_id: i.pktId,
            target_node: i.to,
            origin_node: i.from,
            envelope: i.envelope,
            priority: i.priority,
          }));
          const { error } = await supabaseAdmin
            .from("relay_envelopes")
            .upsert(rows, { onConflict: "pkt_id", ignoreDuplicates: true });
          if (error) return json({ ok: false, error: "kuyruk_hatasi" }, 500);
          return json({ ok: true, stored: rows.length });
        }

        // pull
        if (parsed.ack.length) {
          await supabaseAdmin
            .from("relay_envelopes")
            .delete()
            .eq("target_node", parsed.nodeId)
            .in("pkt_id", parsed.ack);
        }
        // Süresi dolmuş zarfları temizle (ucuz, indeksli).
        await supabaseAdmin
          .from("relay_envelopes")
          .delete()
          .lt("expires_at", new Date().toISOString());

        const { data } = await supabaseAdmin
          .from("relay_envelopes")
          .select("pkt_id, envelope")
          .eq("target_node", parsed.nodeId)
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(MAX_PULL);

        return json({
          ok: true,
          items: (data ?? []).map((r) => ({ pktId: r.pkt_id, envelope: r.envelope })),
        });
      },
    },
  },
});
