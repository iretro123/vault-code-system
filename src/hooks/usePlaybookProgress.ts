import { useState, useEffect, useCallback } from "react";
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

export function usePlaybookProgress() {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<PlaybookChapter[]>([]);
  const [progress, setProgress] = useState<Record<string, ChapterProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    const [chapRes, progRes] = await Promise.all([
      supabase.from("playbook_chapters").select("*").order("order_index"),
      supabase.from("playbook_progress").select("*").eq("user_id", user!.id),
    ]);

    if (chapRes.data) {
      setChapters(chapRes.data.map((c: any) => ({
        ...c,
        checkpoint_json: Array.isArray(c.checkpoint_json) ? c.checkpoint_json : [],
      })));
    }

    if (progRes.data) {
      const map: Record<string, ChapterProgress> = {};
      progRes.data.forEach((p: any) => { map[p.chapter_id] = p; });
      setProgress(map);
    }

    setLoading(false);
  }

  const completedCount = Object.values(progress).filter(p => p.status === "completed").length;
  const totalCount = chapters.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const nextChapter = chapters.find(c => {
    const p = progress[c.id];
    return !p || p.status !== "completed";
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

  return {
    chapters,
    progress,
    loading,
    completedCount,
    totalCount,
    pct,
    nextChapter,
    gatesPassed,
    updateProgress,
    refetch: fetchAll,
  };
}
