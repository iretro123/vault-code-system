import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AcademyRoleName = "CEO" | "Admin" | "Coach" | "Member";

interface AcademyPermState {
  roleName: AcademyRoleName;
  permissions: Set<string>;
  appRoles: Set<string>;
  loading: boolean;
  resolved: boolean;
}


export function useAcademyPermissions() {
  const { user } = useAuth();
  const [state, setState] = useState<AcademyPermState>({
    roleName: "Member",
    permissions: new Set(),
    appRoles: new Set(),
    loading: Boolean(user?.id),
    resolved: !user?.id,
  });

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setState({ roleName: "Member", permissions: new Set(), appRoles: new Set(), loading: false, resolved: true });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, resolved: false }));

    (async () => {
      const [userRoleRes, appRolesRes] = await Promise.all([
        supabase
          .from("academy_user_roles")
          .select("role_id, assigned_at, academy_roles(name)")
          .eq("user_id", user.id)
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const userRoleData = userRoleRes.data as any;
      const roleName = (userRoleData?.academy_roles?.name ?? "Member") as AcademyRoleName;
      const roleId = userRoleData?.role_id;

      let permissions: string[] = [];
      if (roleId) {
        const { data: permsData } = await supabase
          .from("academy_role_permissions")
          .select("permission_key")
          .eq("role_id", roleId);
        permissions = (permsData ?? []).map((p: any) => p.permission_key);
      }

      const appRoles = new Set((appRolesRes.data ?? []).map((r: any) => String(r.role)));

      if (cancelled) return;

      setState({
        roleName,
        permissions: new Set(permissions),
        appRoles,
        loading: false,
        resolved: true,
      });

    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hasPermission = useCallback(
    (key: string) => state.permissions.has(key),
    [state.permissions]
  );

  const hasAppRole = useCallback(
    (role: string) => state.appRoles.has(role),
    [state.appRoles]
  );

  const isCEO = state.roleName === "CEO";
  const isAdmin = state.roleName === "Admin" || isCEO;
  const isCoach = state.roleName === "Coach" || isAdmin;
  const isOperator = state.appRoles.has("operator");

  return {
    roleName: state.roleName,
    hasPermission,
    hasAppRole,
    isCEO,
    isAdmin,
    isCoach,
    isOperator,
    appRoles: Array.from(state.appRoles),
    loading: state.loading,
    resolved: state.resolved,
  };
}

