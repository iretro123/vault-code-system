import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { toast } from "sonner";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function computeLevel(lessonsCompleted: number): string {
  if (lessonsCompleted >= 9) return "advanced";
  if (lessonsCompleted >= 3) return "intermediate";
  return "beginner";
}

export function useRoleEvolution() {
  const { user, profile } = useAuth();
  const { progress, loading } = useLessonProgress();
  const checked = useRef(false);

  useEffect(() => {
    if (!user || !profile || loading || checked.current) return;
    // Only evolve if user has already claimed a role
    if (!profile.role_level) return;

    checked.current = true;

    const completedCount = Object.values(progress).filter(Boolean).length;
    const computed = computeLevel(completedCount);
    const current = profile.role_level;

    // Only upgrade, never downgrade
    const levels = ["beginner", "intermediate", "advanced"];
    if (levels.indexOf(computed) <= levels.indexOf(current)) return;

    // Upgrade silently
    supabase
      .from("profiles")
      .update({ role_level: computed } as any)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (!error) {
          refetchProfile();
          toast.success(`You've leveled up to ${LEVEL_LABELS[computed]}!`, { duration: 4000 });
        }
      });
  }, [user, profile, progress, loading]);
}
