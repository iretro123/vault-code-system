import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PlaybookChapter {
  id: string;
  title: string;
  order_index: number;
  minutes_estimate: number;
  pdf_page_start: number;
  pdf_page_end: number;
  checkpoint_json: any[];
  action_type: string;
  action_payload: any;
}

export interface ChapterProgress {
  chapter_id: string;
  status: "not_started" | "in_progress" | "completed";
  last_page_viewed: number;
  time_in_reader_seconds: number;
  checkpoint_score: number;
  checkpoint_passed: boolean;
  completed_at: string | null;
}

const PB_CHAPTERS_CACHE = "va_cache_pb_chapters";
const PB_PROGRESS_CACHE = "va_cache_pb_progress";

function readPbCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function usePlaybookProgress() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<PlaybookChapter[]>(() => readPbCache(PB_CHAPTERS_CACHE, []));
  const [progress, setProgress] = useState<Record<string, ChapterProgress>>(() => readPbCache(PB_PROGRESS_CACHE, {}));
  const [loading, setLoading] = useState(() => readPbCache(PB_CHAPTERS_CACHE, []).length === 0);
  const [lastChapterId, setLastChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    if (chapters.length === 0) setLoading(true);
    const [chapRes, progRes, stateRes] = await Promise.all([
      supabase.from("playbook_chapters").select("*").order("order_index"),
      supabase.from("playbook_progress").select("*").eq("user_id", user!.id),
      supabase.from("user_playbook_state").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);

    if (chapRes.data) {
      const mapped = chapRes.data.map((c: any) => ({
        ...c,
        checkpoint_json: Array.isArray(c.checkpoint_json) ? c.checkpoint_json : [],
      }));
      setChapters(mapped);
      try { localStorage.setItem(PB_CHAPTERS_CACHE, JSON.stringify(mapped)); } catch {}
    }

    if (progRes.data) {
      const map: Record<string, ChapterProgress> = {};
      progRes.data.forEach((p: any) => { map[p.chapter_id] = p; });
      setProgress(map);
      try { localStorage.setItem(PB_PROGRESS_CACHE, JSON.stringify(map)); } catch {}
    }

    if (stateRes.data?.last_chapter_id) {
      setLastChapterId(stateRes.data.last_chapter_id);
    }

    setLoading(false);
  }

  const completedCount = Object.values(progress).filter(p => p.status === "completed" || p.checkpoint_passed).length;
  const totalCount = chapters.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Guided unlock: highest completed order_index + 1
  const unlockedIndex = useMemo(() => {
    let highest = 0;
    for (const ch of chapters) {
      const p = progress[ch.id];
      if (p && (p.status === "completed" || p.checkpoint_passed)) {
        highest = Math.max(highest, ch.order_index);
      }
    }
    return highest + 1;
  }, [chapters, progress]);

  const nextChapter = chapters.find(c => {
    const p = progress[c.id];
    return !p || (p.status !== "completed" && !p.checkpoint_passed);
  });

  const chaptersWithGates = chapters.slice(0, 2);
  const gatesPassed = chaptersWithGates.every(c => progress[c.id]?.checkpoint_passed);

  const updateProgress = useCallback(async (chapterId: string, updates: Partial<ChapterProgress>) => {
    if (!user) return;
    const existing = progress[chapterId];
    const payload = {
      user_id: user.id,
      chapter_id: chapterId,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("playbook_progress")
        .update(payload as any)
        .eq("user_id", user.id)
        .eq("chapter_id", chapterId);
    } else {
      await supabase.from("playbook_progress").insert(payload as any);
    }

    setProgress(prev => ({
      ...prev,
      [chapterId]: { ...prev[chapterId], ...updates } as ChapterProgress,
    }));
  }, [user, progress]);

  const saveReadingState = useCallback(async (chapterId: string, page: number) => {
    if (!user) return;
    // Save last page to progress
    updateProgress(chapterId, {
      last_page_viewed: page,
      status: progress[chapterId]?.status === "completed" ? "completed" : "in_progress",
    });

    // Save last chapter to user_playbook_state
    const { data: existing } = await supabase
      .from("user_playbook_state")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase.from("user_playbook_state")
        .update({ last_chapter_id: chapterId, last_page_viewed: page, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_playbook_state")
        .insert({ user_id: user.id, last_chapter_id: chapterId, last_page_viewed: page } as any);
    }

    setLastChapterId(chapterId);
  }, [user, progress, updateProgress]);

  return {
    chapters,
    progress,
    loading,
    completedCount,
    totalCount,
    pct,
    nextChapter,
    gatesPassed,
    unlockedIndex,
    lastChapterId,
    updateProgress,
    saveReadingState,
    refetch: fetchAll,
  };
}
