import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AcademyRoleName = "CEO" | "Admin" | "Coach" | "Member";

interface PermissionsData {
  roleName: AcademyRoleName;
  permissions: Set<string>;
  appRoles: Set<string>;
}

async function fetchPermissions(userId: string): Promise<PermissionsData> {
  const [userRoleRes, appRolesRes] = await Promise.all([
    supabase
      .from("academy_user_roles")
      .select("role_id, assigned_at, academy_roles(name)")
      .eq("user_id", userId)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
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

  return { roleName, permissions: new Set(permissions), appRoles };
}

export function useAcademyPermissions() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["academy-permissions", user?.id],
    queryFn: () => fetchPermissions(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const state = data ?? { roleName: "Member" as AcademyRoleName, permissions: new Set<string>(), appRoles: new Set<string>() };

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
    loading: isLoading,
    resolved: !isLoading,
  };
}
