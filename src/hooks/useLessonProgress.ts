import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProgressRecord {
  id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

export function useLessonProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", user.id);

    const map: Record<string, boolean> = {};
    (data as ProgressRecord[] || []).forEach((r) => {
      if (r.completed) map[r.lesson_id] = true;
    });
    setProgress(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const markComplete = useCallback(async (lessonId: string) => {
    if (!user) return;
    await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id,lesson_id" }
    );
    setProgress((prev) => ({ ...prev, [lessonId]: true }));

    // Also mark first_lesson_started on profile
    supabase
      .from("profiles")
      .update({ first_lesson_started: true } as any)
      .eq("user_id", user.id)
      .then(() => {});
  }, [user]);

  return { progress, loading, markComplete, refetch: fetchProgress };
}
