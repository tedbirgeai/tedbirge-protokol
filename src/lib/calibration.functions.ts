import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  carrier: z.enum([
    "lora",
    "halow",
    "tvws",
    "wifi",
    "wigig",
    "fso",
    "cellular",
    "satellite",
    "eth",
  ]),
  terrain: z.enum(["los", "rural", "suburb", "city", "forest"]),
  antennaHeight: z.enum(["hand", "roof", "mast"]),
});

/** Gerçek saha ölçümleriyle model kalibrasyon testi çalıştırır ve sonucu kaydeder. */
export const runCalibrationTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { runCalibration } = await import("@/lib/calibration.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("field_measurements")
      .select("carrier, terrain, antenna_height, distance_km, link_ok")
      .eq("carrier", data.carrier)
      .eq("terrain", data.terrain)
      .eq("antenna_height", data.antennaHeight)
      .limit(500);

    const result = runCalibration(
      data.carrier,
      data.terrain,
      data.antennaHeight,
      (rows ?? []).map((m) => ({
        carrier: m.carrier,
        terrain: m.terrain,
        antenna_height: m.antenna_height,
        distance_km: Number(m.distance_km),
        link_ok: m.link_ok,
      })),
    );

    await supabaseAdmin.from("calibration_runs").insert({
      user_id: context.userId,
      carrier: data.carrier,
      terrain: data.terrain,
      antenna_height: data.antennaHeight,
      sample_count: result.sampleCount,
      model_hop_km: result.modelHopKm,
      calibrated_hop_km: result.calibratedHopKm,
      mae_km: result.maeKm,
      bias_km: result.biasKm,
      accuracy_pct: result.accuracyPct,
      verdict: result.verdict,
      detail: { folds: result.folds } as never,
    });

    return result;
  });
