import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { ADVISOR_SYSTEM_PROMPT } from "@/lib/ai-advisor-prompt";
import { checkChatRateLimit } from "@/lib/chat-rate-limit.server";

type ChatRequestBody = { messages?: unknown };

const MAX_MESSAGES = 60;
const MAX_CHARS = 6000;

function messageText(message: unknown): string {
  const parts = (message as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (p && typeof p === "object" && (p as { type?: string }).type === "text"
      ? String((p as { text?: unknown }).text ?? "")
      : ""))
    .join("");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Geçersiz istek", { status: 400 });
        }

        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Mesaj gerekli", { status: 400 });
        }
        if (messages.length > MAX_MESSAGES) {
          return new Response("Sohbet çok uzun", { status: 413 });
        }

        const invalid = messages.some(
          (m) =>
            !m ||
            typeof m !== "object" ||
            !["user", "assistant", "system"].includes(String((m as { role?: unknown }).role)) ||
            !Array.isArray((m as { parts?: unknown }).parts),
        );
        if (invalid) return new Response("Mesaj biçimi geçersiz", { status: 400 });

        const totalChars = messages.reduce((n, m) => n + messageText(m).length, 0);
        if (totalChars > MAX_CHARS * 4) {
          return new Response("Sohbet çok uzun", { status: 413 });
        }
        const last = messages[messages.length - 1];
        if (messageText(last).length > MAX_CHARS) {
          return new Response("Mesaj çok uzun", { status: 413 });
        }

        const limit = await checkChatRateLimit(request);
        if (!limit.ok) {
          return new Response(limit.message, {
            status: 429,
            headers: { "retry-after": String(limit.retryAfterSeconds) },
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI yapılandırması eksik", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);


        const kaydet_talep = tool({
          description:
            "Nitelikli ziyaretçi talebini Tedbirge ekibine iletir. Yalnızca kullanıcı onay verdiğinde ve e-posta bilindiğinde çağır.",
          inputSchema: z.object({
            kurum: z.string().optional().describe("Kurum / şirket adı"),
            kisi: z.string().optional().describe("İlgili kişinin adı"),
            eposta: z.string().describe("İletişim e-posta adresi"),
            telefon: z.string().optional(),
            ulke: z.string().optional().describe("Ülke veya bölge"),
            senaryo: z.string().describe("Kullanım senaryosu özeti"),
            tasiyici: z.string().optional().describe("İhtiyaç duyulan taşıyıcı(lar)"),
            dugum_sayisi: z.string().optional(),
            aciliyet: z.string().optional().describe("Zaman planı / aciliyet"),
            nitelik_puani: z.number().optional().describe("0-100 arası uygunluk puanı"),
            ozet: z.string().describe("Ekibe iletilecek 2-3 cümlelik özet"),
          }),
          execute: async (input) => {
            const email = String(input.eposta ?? "").trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return { ok: false, hata: "E-posta geçersiz, kullanıcıdan tekrar iste." };
            }
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const score = Number.isFinite(input.nitelik_puani)
                ? Math.max(0, Math.min(100, Math.round(Number(input.nitelik_puani))))
                : null;
              const { data: inserted, error } = await supabaseAdmin
                .from("ai_leads")
                .insert({
                  organization: input.kurum?.slice(0, 200) ?? null,
                  contact_name: input.kisi?.slice(0, 200) ?? null,
                  email: email.slice(0, 200),
                  phone: input.telefon?.slice(0, 60) ?? null,
                  country: input.ulke?.slice(0, 120) ?? null,
                  use_case: input.senaryo?.slice(0, 4000) ?? null,
                  carrier_need: input.tasiyici?.slice(0, 400) ?? null,
                  node_count: input.dugum_sayisi?.slice(0, 60) ?? null,
                  urgency: input.aciliyet?.slice(0, 200) ?? null,
                  qualification_score: score,
                  summary: input.ozet?.slice(0, 4000) ?? null,
                  transcript: messages as unknown as never,
                })
                .select("id")
                .single();
              if (error || !inserted) {
                console.error("[ai_leads] insert failed", error?.message);
                return { ok: false, hata: "Kayıt sırasında teknik hata oluştu." };
              }

              const { generateLeadPlan } = await import("@/lib/lead-plan.server");
              const plan = await generateLeadPlan({
                kurum: input.kurum ?? null,
                ulke: input.ulke ?? null,
                senaryo: input.senaryo ?? null,
                tasiyici: input.tasiyici ?? null,
                dugum: input.dugum_sayisi ?? null,
                aciliyet: input.aciliyet ?? null,
              });
              if (plan) {
                await supabaseAdmin
                  .from("ai_leads")
                  .update({ plan: plan as unknown as never, proposal_ref: inserted.id })
                  .eq("id", inserted.id);
              }

              const { notifyLeadStatus } = await import("@/lib/lead-notify.server");
              await notifyLeadStatus({
                leadId: inserted.id,
                fromStatus: null,
                toStatus: "new",
                note: input.ozet?.slice(0, 500) ?? null,
                lead: {
                  email,
                  phone: input.telefon ?? null,
                  contact_name: input.kisi ?? null,
                  organization: input.kurum ?? null,
                },
              });

              return {
                ok: true,
                mesaj: "Talep ekibe iletildi.",
                plan_ozeti: plan
                  ? {
                      ilk_adim: plan.adimlar[0]?.baslik ?? null,
                      belge_sayisi: plan.belgeler.length,
                    }
                  : null,
                yonlendirme:
                  "Belgeleri ve kanıtları /pilot-panosu adresinden yükleyebilir; kontrol listesini oradan takip edebilir.",
              };
            } catch (e) {
              console.error("[ai_leads] insert exception", e);
              return { ok: false, hata: "Kayıt sırasında teknik hata oluştu." };
            }

          },
        });

        try {
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: ADVISOR_SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages as UIMessage[]),
            tools: { kaydet_talep },
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            onError: (error) => {
              console.error("[api/chat] stream error", error);
              return "Danışman şu anda yanıt veremiyor. Lütfen tekrar deneyin.";
            },
          });
        } catch (e) {
          console.error("[api/chat] failed", e);
          return new Response("Danışman şu anda kullanılamıyor", { status: 502 });
        }
      },
    },
  },
});
