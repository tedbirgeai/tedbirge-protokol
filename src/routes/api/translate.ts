import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { checkChatRateLimit } from "@/lib/chat-rate-limit.server";

type Body = { text?: unknown; to?: unknown };

const LANGS: Record<string, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  ar: "Arapça",
  de: "Almanca",
  fr: "Fransızca",
  ru: "Rusça",
  es: "İspanyolca",
  fa: "Farsça",
};

export const Route = createFileRoute("/api/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Geçersiz istek", { status: 400 });
        }
        const text = String(body.text ?? "").trim();
        const to = String(body.to ?? "").trim();
        if (!text || text.length > 2000) return new Response("Metin geçersiz", { status: 400 });
        const target = LANGS[to];
        if (!target) return new Response("Dil desteklenmiyor", { status: 400 });

        const limit = await checkChatRateLimit(request);
        if (!limit.ok) {
          return new Response(limit.message, {
            status: 429,
            headers: { "retry-after": String(limit.retryAfterSeconds) },
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Çeviri yapılandırması eksik", { status: 500 });

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const { text: out } = await generateText({
            model: gateway("google/gemini-3.6-flash"),
            system:
              "Sen bir çeviri motorusun. Sana verilen metni yalnızca hedef dile çevir. Açıklama, tırnak, ön söz ekleme. Emoji, sayı, isim ve ölçü birimlerini koru. Metin zaten hedef dilde ise aynen geri döndür.",
            prompt: `Hedef dil: ${target}\n\nMetin:\n${text}`,
          });
          return Response.json({ text: out.trim() });
        } catch (e) {
          console.error("[api/translate] failed", e);
          return new Response("Çeviri şu an kullanılamıyor", { status: 502 });
        }
      },
    },
  },
});
