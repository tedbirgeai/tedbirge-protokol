import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CARRIER_IDS = [
  "lora",
  "halow",
  "tvws",
  "wifi",
  "wigig",
  "fso",
  "cellular",
  "satellite",
  "eth",
] as const;
const TERRAIN_IDS = ["los", "rural", "suburb", "city", "forest"] as const;
const HEIGHT_IDS = ["hand", "roof", "mast"] as const;

const ChainInput = z.object({
  licenseId: z.string().uuid(),
  carrierId: z.enum(CARRIER_IDS),
  terrainId: z.enum(TERRAIN_IDS),
  heightId: z.enum(HEIGHT_IDS),
  distanceKm: z.number().min(0.1).max(200),
  region: z.enum(["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"]).default("TR"),
  prefix: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .regex(/^[a-zA-Z0-9-]+$/)
    .default("zincir"),
});

/**
 * Mesafeye göre gereken röle sayısını hesaplar ve
 * ev köprüsü + ara röleler + saha ucu düğümlerini tek işlemde oluşturur.
 */
export const provisionRelayChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChainInput.parse(input))
  .handler(async ({ data, context }) => {
    const { buildMeshPlan } = await import("@/lib/mesh-plan");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await context.supabase
      .from("licenses")
      .select("id, user_id, node_limit, license_key")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license || license.user_id !== context.userId) throw new Error("Lisans bulunamadı.");

    const { data: measurements } = await supabaseAdmin
      .from("field_measurements")
      .select("carrier, terrain, antenna_height, distance_km, link_ok")
      .eq("carrier", data.carrierId)
      .eq("terrain", data.terrainId)
      .eq("antenna_height", data.heightId)
      .limit(200);

    const plan = buildMeshPlan({
      carrierId: data.carrierId,
      terrainId: data.terrainId,
      heightId: data.heightId,
      distanceKm: data.distanceKm,
      measurements: (measurements ?? []).map((m) => ({
        carrier: m.carrier,
        terrain: m.terrain,
        antenna_height: m.antenna_height,
        distance_km: Number(m.distance_km),
        link_ok: m.link_ok,
      })),
    });

    const { data: existing } = await supabaseAdmin
      .from("devices")
      .select("id, node_id")
      .eq("license_id", license.id);

    const existingIds = new Set((existing ?? []).map((d) => d.node_id));
    const group = `${data.prefix}`;

    const wanted = plan.chain.map((n, index) => ({
      node_id: `${data.prefix}-${n.nodeId}`,
      label: n.label,
      role: n.role,
      failover_priority: n.role === "gateway" ? 1 : n.role === "relay" ? 10 + index : 100,
    }));

    const toCreate = wanted.filter((w) => !existingIds.has(w.node_id));
    const capacity = license.node_limit - (existing?.length ?? 0);
    if (toCreate.length > capacity) {
      throw new Error(
        `Bu plan ${wanted.length} düğüm gerektiriyor; lisans limiti ${license.node_limit}, boş kapasite ${Math.max(0, capacity)}. Röleleri daha yüksek noktaya taşıyın ya da planı yükseltin.`,
      );
    }

    if (toCreate.length) {
      const { error } = await supabaseAdmin.from("devices").insert(
        toCreate.map((w) => ({
          license_id: license.id,
          user_id: context.userId,
          node_id: w.node_id,
          label: w.label,
          region: data.region,
          carrier: data.carrierId,
          status: "active",
          kind: "node",
          role: w.role,
          failover_group: group,
          failover_priority: w.failover_priority,
        })),
      );
      if (error) throw new Error("Zincir düğümleri oluşturulamadı.");
    }

    const { data: saved } = await supabaseAdmin
      .from("relay_plans")
      .insert({
        user_id: context.userId,
        license_id: license.id,
        name: `${data.prefix} · ${plan.carrier.name} · ${data.distanceKm} km`,
        carrier: data.carrierId,
        terrain: data.terrainId,
        antenna_height: data.heightId,
        distance_km: data.distanceKm,
        hop_km: Number(plan.hopKm.toFixed(3)),
        relay_count: plan.relays,
        nodes: wanted as never,
      })
      .select("id")
      .single();

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      event: "relay_chain_provisioned",
      detail: `${wanted.length} düğüm · ${plan.relays} röle · ${data.distanceKm} km · ${plan.carrier.name}`,
      actor: "customer",
    });

    return {
      ok: true,
      planId: saved?.id ?? null,
      created: toCreate.map((t) => t.node_id),
      existing: wanted.filter((w) => existingIds.has(w.node_id)).map((w) => w.node_id),
      relays: plan.relays,
      hopKm: plan.hopKm,
      totalNodes: wanted.length,
      licenseKey: license.license_key,
    };
  });

/** Düğüm rolü ve otomatik failover ayarlarını günceller. */
export const updateNodeTopology = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: z.string().uuid(),
        role: z.enum(["gateway", "relay", "edge"]).optional(),
        failoverGroup: z.string().trim().max(40).nullable().optional(),
        failoverPriority: z.number().int().min(1).max(999).optional(),
        isBackup: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: device } = await context.supabase
      .from("devices")
      .select("id, user_id, license_id, node_id")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (!device || device.user_id !== context.userId) throw new Error("Düğüm bulunamadı.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      role?: string;
      failover_group?: string | null;
      failover_priority?: number;
      is_backup?: boolean;
    } = {};
    if (data.role !== undefined) patch.role = data.role;
    if (data.failoverGroup !== undefined) patch.failover_group = data.failoverGroup || null;
    if (data.failoverPriority !== undefined) patch.failover_priority = data.failoverPriority;
    if (data.isBackup !== undefined) patch.is_backup = data.isBackup;

    const { error } = await supabaseAdmin.from("devices").update(patch).eq("id", device.id);
    if (error) throw new Error("Topoloji güncellenemedi.");

    await supabaseAdmin.from("license_events").insert({
      license_id: device.license_id,
      user_id: context.userId,
      device_id: device.id,
      event: "topology_updated",
      detail: `${device.node_id} · ${JSON.stringify(patch)}`,
      actor: "customer",
    });

    return { ok: true };
  });

/** Bağlantı alarmını okundu olarak işaretler. */
export const acknowledgeLinkAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("link_alerts")
      .update({ acknowledged: true })
      .eq("id", data.id);
    if (error) throw new Error("Alarm güncellenemedi.");
    return { ok: true };
  });

/** /kapsama sayfasından gerçek saha ölçümü kaydı. */
export const saveFieldMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        carrier: z.enum(CARRIER_IDS),
        terrain: z.enum(TERRAIN_IDS),
        antennaHeight: z.enum(HEIGHT_IDS),
        distanceKm: z.number().min(0.01).max(500),
        linkOk: z.boolean(),
        rssiDbm: z.number().min(-160).max(20).nullable().optional(),
        snrDb: z.number().min(-40).max(60).nullable().optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("field_measurements").insert({
      user_id: context.userId,
      carrier: data.carrier,
      terrain: data.terrain,
      antenna_height: data.antennaHeight,
      distance_km: data.distanceKm,
      link_ok: data.linkOk,
      rssi_dbm: data.rssiDbm ?? null,
      snr_db: data.snrDb ?? null,
      note: data.note ?? null,
    });
    if (error) throw new Error("Ölçüm kaydedilemedi.");
    return { ok: true };
  });

/** Kapsama sayfasının kalibrasyonu için anonim ölçüm özeti (kişi bilgisi içermez). */
export const listFieldMeasurements = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("field_measurements")
    .select("carrier, terrain, antenna_height, distance_km, link_ok")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []).map((m) => ({
    carrier: m.carrier as string,
    terrain: m.terrain as string,
    antenna_height: m.antenna_height as string,
    distance_km: Number(m.distance_km),
    link_ok: Boolean(m.link_ok),
  }));
});
