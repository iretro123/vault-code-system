import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";

export type AcademyRole = "admin" | "student";
export type AcademyExperience = "newbie" | "active" | "veteran";

export function useAcademyRole() {
  const { profile } = useAuth();
  const { isAdmin: rbacAdmin, hasPermission } = useAcademyPermissions();

  const academyRole: AcademyRole = rbacAdmin ? "admin" : "student";
  const experience: AcademyExperience =
    (profile as any)?.academy_experience ?? "newbie";
  const isAdmin = rbacAdmin;

  return { academyRole, experience, isAdmin, hasPermission };
}
