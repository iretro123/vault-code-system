import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { isLocalDesignPreview } from '@/integrations/supabase/localPreviewFetch';
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
  const [progressState, setProgressState] = useState<{owner:string; data:Record<string, ChapterProgress>}>({owner:user?.id || '',data:readPbCache(`${PB_PROGRESS_CACHE}:${user?.id || 'signed-out'}`, {})});
  const progress = progressState.owner === user?.id ? progressState.data : {};
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const [loading, setLoading] = useState(() => readPbCache(PB_CHAPTERS_CACHE, []).length === 0);
  const [lastChapterId, setLastChapterId] = useState<string | null>(null);

  useEffect(() => {
    setLastChapterId(null);
    setProgressState({owner:user?.id || '',data:user?readPbCache(`${PB_PROGRESS_CACHE}:${user.id}`, {}):{}});
    if (!user) { setLoading(false); return; }
    fetchAll();
  }, [user]);

  async function fetchAll() {
    const owner = user?.id;
    if (!owner) return;
    if (chapters.length === 0) setLoading(true);
    const [chapRes, progRes, stateRes] = await Promise.all([
      supabase.from("playbook_chapters").select("*").order("order_index"),
      supabase.from("playbook_progress").select("*").eq("user_id", user!.id),
      supabase.from("user_playbook_state").select("*").eq("user_id", user!.id).maybeSingle(),
    ]);
    if (activeUser.current !== owner) return;

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
      const current = isLocalDesignPreview() ? readPbCache(`${PB_PROGRESS_CACHE}:${owner}`, map) : map;
      setProgressState({owner,data:current});
      try { localStorage.setItem(`${PB_PROGRESS_CACHE}:${owner}`, JSON.stringify(current)); } catch {}
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
    if (!user) return false;
    const owner = user.id;
    const payload = {
      user_id: user.id,
      chapter_id: chapterId,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    try {
      if (!isLocalDesignPreview()) {
        const {error} = await supabase.from("playbook_progress").upsert(payload as any, {onConflict:'user_id,chapter_id'});
        if (error) throw error;
      }
    } catch {
      toast.error('Reading progress was not saved. Try again when your connection is back.', {id:'playbook-save'});
      return false;
    }
    if (activeUser.current !== owner) return false;
    setProgressState(prev => {
      const previous = prev.owner === owner ? prev.data : {};
      const data = {...previous,[chapterId]:{...previous[chapterId],...updates} as ChapterProgress};
      try { localStorage.setItem(`${PB_PROGRESS_CACHE}:${owner}`, JSON.stringify(data)); } catch {}
      return {owner,data};
    });
    return true;
  }, [user, progress]);

  const saveReadingState = useCallback(async (chapterId: string, page: number) => {
    if (!user) return;
    const owner = user.id;
    // Save last page to progress
    const saved = await updateProgress(chapterId, {
      last_page_viewed: page,
      status: progress[chapterId]?.status === "completed" ? "completed" : "in_progress",
    });
    if (!saved) return;

    if (isLocalDesignPreview()) {
      if (activeUser.current === owner) setLastChapterId(chapterId);
      return;
    }
    // Save last chapter to user_playbook_state
    try {
    const { data: existing, error: readError } = await supabase
      .from("user_playbook_state")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw readError;
    let result;
    if (existing) {
      result = await supabase.from("user_playbook_state")
        .update({ last_chapter_id: chapterId, last_page_viewed: page, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    } else {
      result = await supabase.from("user_playbook_state")
        .insert({ user_id: user.id, last_chapter_id: chapterId, last_page_viewed: page } as any);
    }

    if (result.error) throw result.error;
    if (activeUser.current === owner) setLastChapterId(chapterId);
    } catch { toast.error('Your reading position was not saved. Please try again.', {id:'playbook-save'}); }
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
