import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  licenseId: z.string().uuid(),
  nodeId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, "Düğüm adı yalnızca harf, rakam, nokta, tire içerebilir."),
  label: z.string().trim().max(120).optional(),
  region: z.enum(["TR", "EU", "US", "UK", "GCC", "APAC", "JP", "OTHER"]).default("TR"),
  carrier: z
    .enum(["eth", "wifi", "cellular", "satellite", "wigig", "fso", "halow", "tvws", "lora"])
    .default("lora"),
});

const DeviceInput = z.object({
  deviceId: z.string().uuid(),
  status: z.enum(["active", "revoked"]).optional(),
});

const ReportInput = z.object({
  deviceId: z.string().uuid().optional(),
  severity: z.enum(["info", "warning", "critical"]),
  category: z.enum(["coverage", "hardware", "interference", "power", "permit", "other"]),
  title: z.string().trim().min(3).max(160),
  detail: z.string().trim().min(10).max(4000),
});

/** Panelden tek tıkla düğüm oluşturur; lisans sahipliği ve düğüm limiti sunucuda doğrulanır. */
export const createDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: license } = await context.supabase
      .from("licenses")
      .select("id, user_id, node_limit, status")
      .eq("id", data.licenseId)
      .maybeSingle();

    if (!license || license.user_id !== context.userId) throw new Error("Lisans bulunamadı.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("license_id", license.id);

    if ((count ?? 0) >= license.node_limit) {
      throw new Error(
        `Düğüm limiti doldu (${license.node_limit}). Daha fazla düğüm için planı yükseltin.`,
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("license_id", license.id)
      .eq("node_id", data.nodeId)
      .maybeSingle();
    if (existing) throw new Error("Bu düğüm adı zaten kayıtlı.");

    const { data: device, error } = await supabaseAdmin
      .from("devices")
      .insert({
        license_id: license.id,
        user_id: context.userId,
        node_id: data.nodeId,
        label: data.label || null,
        region: data.region,
        carrier: data.carrier,
        status: "active",
      })
      .select("*")
      .single();
    if (error || !device) throw new Error("Düğüm oluşturulamadı.");

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      device_id: device.id,
      event: "device_created",
      detail: `${data.nodeId} · ${data.region} · ${data.carrier}`,
      actor: "customer",
    });

    const { dispatchWebhook } = await import("@/lib/webhooks.server");
    await dispatchWebhook(context.userId, "license_event", {
      event: "device_created",
      license_id: license.id,
      device_id: device.id,
      node_id: data.nodeId,
    });

    return { ok: true, device };
  });

/** Düğümü iptal eder veya yeniden açar. */
export const setDeviceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const status = data.status ?? "revoked";
    const { data: device } = await context.supabase
      .from("devices")
      .select("id, user_id, license_id, node_id")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (!device || device.user_id !== context.userId) throw new Error("Düğüm bulunamadı.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ status })
      .eq("id", device.id);
    if (error) throw new Error("Düğüm güncellenemedi.");

    await supabaseAdmin.from("license_events").insert({
      license_id: device.license_id,
      user_id: context.userId,
      device_id: device.id,
      event: status === "active" ? "device_reactivated" : "device_revoked",
      detail: device.node_id,
      actor: "customer",
    });

    const { dispatchWebhook } = await import("@/lib/webhooks.server");
    await dispatchWebhook(context.userId, "license_event", {
      event: status === "active" ? "device_reactivated" : "device_revoked",
      license_id: device.license_id,
      device_id: device.id,
      node_id: device.node_id,
    });

    return { ok: true, status };
  });

/** Düğümü siler ve olay günlüğüne yazar. */
export const deleteDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeviceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: device } = await context.supabase
      .from("devices")
      .select("id, user_id, license_id, node_id")
      .eq("id", data.deviceId)
      .maybeSingle();
    if (!device || device.user_id !== context.userId) throw new Error("Düğüm bulunamadı.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("devices").delete().eq("id", device.id);
    await supabaseAdmin.from("license_events").insert({
      license_id: device.license_id,
      user_id: context.userId,
      event: "device_deleted",
      detail: device.node_id,
      actor: "customer",
    });

    const { dispatchWebhook } = await import("@/lib/webhooks.server");
    await dispatchWebhook(context.userId, "license_event", {
      event: "device_deleted",
      license_id: device.license_id,
      node_id: device.node_id,
    });

    return { ok: true };
  });

/** Saha uyarısı / şikayeti oluşturur. */
export const createFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReportInput.parse(input))
  .handler(async ({ data, context }) => {
    let licenseId: string | null = null;
    if (data.deviceId) {
      const { data: device } = await context.supabase
        .from("devices")
        .select("id, user_id, license_id")
        .eq("id", data.deviceId)
        .maybeSingle();
      if (!device || device.user_id !== context.userId) throw new Error("Düğüm bulunamadı.");
      licenseId = device.license_id;
    }

    const { data: report, error } = await context.supabase
      .from("field_reports")
      .insert({
        user_id: context.userId,
        device_id: data.deviceId ?? null,
        license_id: licenseId,
        severity: data.severity,
        category: data.category,
        title: data.title,
        detail: data.detail,
      })
      .select("*")
      .single();
    if (error || !report) throw new Error("Bildirim kaydedilemedi.");

    const { dispatchWebhook } = await import("@/lib/webhooks.server");
    await dispatchWebhook(context.userId, "field_report", {
      report_id: report.id,
      severity: data.severity,
      category: data.category,
      title: data.title,
      detail: data.detail,
      device_id: data.deviceId ?? null,
      license_id: licenseId,
    });

    return { ok: true, report };
  });

/** Yönetici saha bildirimini kapatır / notlar. */
export const updateFieldReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved", "dismissed"]),
        adminNote: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("field_reports")
      .update({ status: data.status, admin_note: data.adminNote ?? null })
      .eq("id", data.reportId);
    if (error) throw new Error("Bildirim güncellenemedi (admin yetkisi gerekir).");
    return { ok: true };
  });
