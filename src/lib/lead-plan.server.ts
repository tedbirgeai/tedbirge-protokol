import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { PLAN_SYSTEM_PROMPT, planPrompt, type LeadPlan } from "@/lib/lead-plan";
import { buildFallbackPlan } from "@/lib/lead-plan-fallback";

const PlanSchema = z.object({
  ozet: z.string().optional(),
  adimlar: z
    .array(
      z.object({
        hafta: z.string().optional(),
        baslik: z.string(),
        aciklama: z.string().optional(),
        sorumlu: z.string().optional(),
      }),
    )
    .optional(),
  belgeler: z
    .array(
      z.object({
        belge: z.string(),
        kurum: z.string().optional(),
        zorunlu: z.boolean().optional(),
        not: z.string().optional(),
      }),
    )
    .optional(),
  riskler: z.array(z.string()).optional(),
});

type PlanInput = {
  kurum?: string | null;
  ulke?: string | null;
  senaryo?: string | null;
  tasiyici?: string | null;
  dugum?: string | null;
  aciliyet?: string | null;
};

/**
 * Plan üretir. AI çıktısı alınamazsa deterministik şablon motoruna düşer;
 * bu fonksiyon asla null döndürmez.
 */
export async function generateLeadPlan(input: PlanInput): Promise<LeadPlan> {
  const fallback = buildFallbackPlan(input);
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return fallback;

  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system: PLAN_SYSTEM_PROMPT,
      prompt: planPrompt(input),
      temperature: 0.3,
      maxRetries: 2,
      output: Output.object({ schema: PlanSchema }),
    });

    const adimlar = (output.adimlar ?? [])
      .filter((a) => a.baslik?.trim())
      .slice(0, 8)
      .map((a, i) => ({
        hafta: a.hafta?.trim() || `${i + 1}. hafta`,
        baslik: a.baslik.trim(),
        aciklama: a.aciklama?.trim() || "Detay saha keşfinde netleştirilecek.",
        sorumlu: a.sorumlu?.trim() || "Tedbirge saha ekibi",
      }));

    const belgeler = (output.belgeler ?? [])
      .filter((b) => b.belge?.trim())
      .slice(0, 12)
      .map((b) => ({
        belge: b.belge.trim(),
        kurum: b.kurum?.trim() || "Pilot kapsamında teyit edilecek",
        zorunlu: b.zorunlu ?? false,
        not: b.not?.trim() || "Pilot kapsamında teyit edilecek.",
      }));

    const riskler = (output.riskler ?? []).filter((r) => r?.trim()).slice(0, 6);

    if (adimlar.length === 0 || belgeler.length === 0) return fallback;

    return {
      ozet: (output.ozet?.trim() || fallback.ozet).slice(0, 1200),
      adimlar,
      belgeler,
      riskler: riskler.length > 0 ? riskler : fallback.riskler,
      olusturuldu: new Date().toISOString(),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("[lead-plan] schema mismatch, using fallback");
    } else {
      console.error("[lead-plan] failed, using fallback", error);
    }
    return fallback;
  }
}
