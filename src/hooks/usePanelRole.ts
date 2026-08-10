import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PanelRole = "admin" | "operator" | "viewer";

/**
 * Panel rolü:
 * - platform admini → admin
 * - organizasyon üyeliği varsa: owner/admin → admin, operator → operator, viewer → viewer
 * - organizasyon üyeliği yoksa kendi hesabının sahibidir → admin
 */
export function usePanelRole(userId?: string) {
  const [role, setRole] = useState<PanelRole>("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setRole("viewer");
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: platform }, { data: memberships }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
        supabase.from("organization_members").select("role").eq("user_id", userId),
      ]);
      if (!active) return;

      if (platform) {
        setRole("admin");
      } else if (!memberships || memberships.length === 0) {
        setRole("admin");
      } else {
        const roles = memberships.map((m) => m.role as string);
        setRole(
          roles.some((r) => r === "owner" || r === "admin")
            ? "admin"
            : roles.includes("operator")
              ? "operator"
              : "viewer",
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  return {
    role,
    loading,
    /** Cihaz/kuyruk işlemleri: operatör ve üzeri. */
    canOperate: role === "admin" || role === "operator",
    /** Anahtar rotasyonu, organizasyon, webhook: yalnız admin. */
    canManage: role === "admin",
    isViewer: role === "viewer",
  };
}

export const ROLE_LABEL: Record<PanelRole, string> = {
  admin: "Yönetici",
  operator: "Operatör",
  viewer: "İzleyici",
};
