import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { PLAN_SYSTEM_PROMPT, planPrompt, type LeadPlan } from "@/lib/lead-plan";

const PlanSchema = z.object({
  ozet: z.string(),
  adimlar: z.array(
    z.object({
      hafta: z.string(),
      baslik: z.string(),
      aciklama: z.string(),
      sorumlu: z.string(),
    }),
  ),
  belgeler: z.array(
    z.object({
      belge: z.string(),
      kurum: z.string(),
      zorunlu: z.boolean(),
      not: z.string(),
    }),
  ),
  riskler: z.array(z.string()),
});

export async function generateLeadPlan(input: {
  kurum?: string | null;
  ulke?: string | null;
  senaryo?: string | null;
  tasiyici?: string | null;
  dugum?: string | null;
  aciliyet?: string | null;
}): Promise<LeadPlan | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;

  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { output } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system: PLAN_SYSTEM_PROMPT,
      prompt: planPrompt(input),
      output: Output.object({ schema: PlanSchema }),
    });

    return {
      ozet: output.ozet.slice(0, 1200),
      adimlar: output.adimlar.slice(0, 8),
      belgeler: output.belgeler.slice(0, 12),
      riskler: output.riskler.slice(0, 6),
      olusturuldu: new Date().toISOString(),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("[lead-plan] schema mismatch");
      return null;
    }
    console.error("[lead-plan] failed", error);
    return null;
  }
}
