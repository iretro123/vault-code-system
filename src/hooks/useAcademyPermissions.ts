import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AcademyRoleName = "CEO" | "Admin" | "Coach" | "Member";

interface AcademyPermState {
  roleName: AcademyRoleName;
  permissions: Set<string>;
  loading: boolean;
}

const CACHE_KEY = "va_cache_academy_rbac";

function readCache(): { roleName: AcademyRoleName; permissions: string[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAcademyPermissions() {
  const { user } = useAuth();
  const cached = readCache();

  const [state, setState] = useState<AcademyPermState>({
    roleName: cached?.roleName ?? "Member",
    permissions: new Set(cached?.permissions ?? []),
    loading: !cached,
  });

  useEffect(() => {
    if (!user?.id) {
      setState({ roleName: "Member", permissions: new Set(), loading: false });
      return;
    }

    (async () => {
      // Fetch user's academy role + permissions in one go
      const { data: userRoleData } = await supabase
        .from("academy_user_roles")
        .select("role_id, academy_roles(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!userRoleData) {
        setState({ roleName: "Member", permissions: new Set(), loading: false });
        return;
      }

      const roleName = ((userRoleData as any).academy_roles?.name ?? "Member") as AcademyRoleName;
      const roleId = userRoleData.role_id;

      const { data: permsData } = await supabase
        .from("academy_role_permissions")
        .select("permission_key")
        .eq("role_id", roleId);

      const permissions = (permsData ?? []).map((p: any) => p.permission_key);

      setState({
        roleName,
        permissions: new Set(permissions),
        loading: false,
      });

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ roleName, permissions }));
      } catch {}
    })();
  }, [user?.id]);

  const hasPermission = useCallback(
    (key: string) => state.permissions.has(key),
    [state.permissions]
  );

  const isCEO = state.roleName === "CEO";
  const isAdmin = state.roleName === "Admin" || isCEO;
  const isCoach = state.roleName === "Coach" || isAdmin;

  return {
    roleName: state.roleName,
    hasPermission,
    isCEO,
    isAdmin,
    isCoach,
    loading: state.loading,
  };
}
