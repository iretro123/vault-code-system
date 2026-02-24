import type { ReactNode } from "react";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";

interface AdminOnlyProps {
  /** Optional permission key — if provided, also checks RBAC */
  permission?: string;
  children: ReactNode;
}

/**
 * Renders children ONLY when:
 * 1. Admin Mode is ON (and not "Preview as Member")
 * 2. If `permission` is set, user must also hold that permission
 */
export function AdminOnly({ permission, children }: AdminOnlyProps) {
  const { isAdminActive } = useAdminMode();
  const { hasPermission } = useAcademyPermissions();

  if (!isAdminActive) return null;
  if (permission && !hasPermission(permission)) return null;

  return <>{children}</>;
}
