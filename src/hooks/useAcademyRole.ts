import { useAuth } from "@/hooks/useAuth";

export type AcademyRole = "admin" | "student";
export type AcademyExperience = "newbie" | "active" | "veteran";

export function useAcademyRole() {
  const { hasRole, profile } = useAuth();

  const academyRole: AcademyRole = hasRole("operator") ? "admin" : "student";
  const experience: AcademyExperience =
    (profile as any)?.academy_experience ?? "newbie";
  const isAdmin = academyRole === "admin";

  return { academyRole, experience, isAdmin };
}
