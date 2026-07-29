import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ORG_ROLES = ["owner", "admin", "operator", "viewer"] as const;

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Organizasyon oluşturur ve kurucuyu 'owner' rolüyle üye yapar. */
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().trim().min(2).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = slugify(data.name) || "org";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .insert({ name: data.name, slug, owner_id: context.userId })
      .select("id, name, slug")
      .single();
    if (error || !org) throw new Error("Organizasyon oluşturulamadı.");

    await supabaseAdmin.from("organization_members").insert({
      organization_id: org.id,
      user_id: context.userId,
      email: context.claims?.email ?? null,
      role: "owner",
    });

    return { ok: true, organization: org };
  });

/** E-posta ile üye ekler veya rolünü günceller (sahip/yönetici yetkisi gerekir). */
export const upsertOrganizationMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        email: z.string().trim().email().max(254),
        role: z.enum(ORG_ROLES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: canManage } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!canManage || !["owner", "admin"].includes(canManage.role)) {
      throw new Error("Bu organizasyonda rol atama yetkiniz yok.");
    }

    const email = data.email.toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) {
      throw new Error("Bu e-posta ile kayıtlı kullanıcı yok. Önce kayıt olmalı.");
    }

    const { error } = await supabaseAdmin.from("organization_members").upsert(
      {
        organization_id: data.organizationId,
        user_id: profile.id,
        email,
        role: data.role,
      },
      { onConflict: "organization_id,user_id" },
    );
    if (error) throw new Error("Üye kaydedilemedi.");

    return { ok: true };
  });

/** Üyeyi organizasyondan çıkarır. */
export const removeOrganizationMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ organizationId: z.string().uuid(), userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me || !["owner", "admin"].includes(me.role)) throw new Error("Yetkiniz yok.");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("owner_id")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (org?.owner_id === data.userId) throw new Error("Organizasyon sahibi çıkarılamaz.");

    await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId);
    return { ok: true };
  });

/** Lisansı bir organizasyona bağlar; böylece tüm üyeler lisansı görebilir. */
export const assignLicenseToOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        licenseId: z.string().uuid(),
        organizationId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: license } = await supabaseAdmin
      .from("licenses")
      .select("id, user_id")
      .eq("id", data.licenseId)
      .maybeSingle();
    if (!license || license.user_id !== context.userId) throw new Error("Lisans bulunamadı.");

    if (data.organizationId) {
      const { data: me } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("organization_id", data.organizationId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!me || !["owner", "admin"].includes(me.role)) throw new Error("Yetkiniz yok.");
    }

    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ organization_id: data.organizationId })
      .eq("id", license.id);
    if (error) throw new Error("Lisans bağlanamadı.");

    await supabaseAdmin.from("license_events").insert({
      license_id: license.id,
      user_id: context.userId,
      event: data.organizationId ? "license_org_linked" : "license_org_unlinked",
      detail: data.organizationId ?? "bağlantı kaldırıldı",
      actor: "customer",
    });

    return { ok: true };
  });
