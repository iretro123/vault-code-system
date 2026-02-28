import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProgressRecord {
  id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
}

const CACHE_KEY = "va_cache_lesson_progress";
const CACHE_TTL = 120_000; // 2 min

function readCache(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Record<string, boolean>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function useLessonProgress() {
  const { user } = useAuth();
  const cached = readCache();
  const [progress, setProgress] = useState<Record<string, boolean>>(cached ?? {});
  const [loading, setLoading] = useState(!cached);

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
    writeCache(map);
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
    const updated = { ...progress, [lessonId]: true };
    setProgress(updated);
    writeCache(updated);

    // Also mark first_lesson_started on profile
    supabase
      .from("profiles")
      .update({ first_lesson_started: true } as any)
      .eq("user_id", user.id)
      .then(() => {});
  }, [user, progress]);

  return { progress, loading, markComplete, refetch: fetchProgress };
}
