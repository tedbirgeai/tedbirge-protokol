import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StatusInput = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "pilot", "won", "lost"]),
  note: z.string().max(1000).optional(),
});

const PlanInput = z.object({ leadId: z.string().uuid() });

async function assertAdmin(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        c: string,
        v: string,
      ) => {
        eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
  };
}) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("role", "admin")
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Bu işlem için admin yetkisi gerekir.");
}

export const updateAiLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Bu işlem için admin yetkisi gerekir.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyLeadStatus } = await import("@/lib/lead-notify.server");

    const { data: lead, error } = await supabaseAdmin
      .from("ai_leads")
      .select("id, status, email, phone, contact_name, organization")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error || !lead) throw new Error("Talep bulunamadı.");

    const fromStatus = lead.status;
    if (fromStatus === data.status && !data.note) {
      return { ok: true, changed: false };
    }

    const { error: updateError } = await supabaseAdmin
      .from("ai_leads")
      .update({ status: data.status, last_notified_status: data.status })
      .eq("id", data.leadId);
    if (updateError) throw new Error("Durum güncellenemedi.");

    await notifyLeadStatus({
      leadId: data.leadId,
      fromStatus,
      toStatus: data.status,
      note: data.note ?? null,
      lead: {
        email: lead.email,
        phone: lead.phone,
        contact_name: lead.contact_name,
        organization: lead.organization,
      },
    });

    return { ok: true, changed: true };
  });

export const rebuildLeadPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Bu işlem için admin yetkisi gerekir.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateLeadPlan } = await import("@/lib/lead-plan.server");

    const { data: lead } = await supabaseAdmin
      .from("ai_leads")
      .select("id, organization, country, use_case, carrier_need, node_count, urgency")
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("Talep bulunamadı.");

    const plan = await generateLeadPlan({
      kurum: lead.organization,
      ulke: lead.country,
      senaryo: lead.use_case,
      tasiyici: lead.carrier_need,
      dugum: lead.node_count,
      aciliyet: lead.urgency,
    });
    if (!plan) throw new Error("Plan üretilemedi, lütfen tekrar deneyin.");

    await supabaseAdmin
      .from("ai_leads")
      .update({ plan: plan as unknown as never })
      .eq("id", data.leadId);

    return { ok: true, plan };
  });
