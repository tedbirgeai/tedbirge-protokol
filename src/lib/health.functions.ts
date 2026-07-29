import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Panelin durum kartları için tek uç nokta: kuyruk gecikmesi, teslimat oranı, telemetri yaşı. */
export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeHealth } = await import("@/lib/health.server");
    const { data: licenses } = await context.supabase.from("licenses").select("id");
    return computeHealth(context.supabase as never, (licenses ?? []).map((l) => l.id));
  });
