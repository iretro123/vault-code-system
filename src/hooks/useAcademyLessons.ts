import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyLesson {
  id: string;
  module_slug: string;
  module_title: string;
  lesson_title: string;
  video_url: string;
  notes: string;
  sort_order: number;
  created_at: string;
}

const CACHE_KEY = "va_cache_lessons";

function readCache(moduleSlug?: string): AcademyLesson[] {
  try {
    const raw = localStorage.getItem(moduleSlug ? `${CACHE_KEY}_${moduleSlug}` : CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useAcademyLessons(moduleSlug?: string) {
  const [lessons, setLessons] = useState<AcademyLesson[]>(() => readCache(moduleSlug));
  const [loading, setLoading] = useState(() => readCache(moduleSlug).length === 0);

  const fetchLessons = useCallback(async () => {
    if (lessons.length === 0) setLoading(true);
    let query = supabase
      .from("academy_lessons")
      .select("*")
      .order("module_slug")
      .order("sort_order");

    if (moduleSlug) {
      query = query.eq("module_slug", moduleSlug);
    }

    const { data } = await query;
    const result = (data as AcademyLesson[]) || [];
    setLessons(result);
    const cacheKey = moduleSlug ? `${CACHE_KEY}_${moduleSlug}` : CACHE_KEY;
    try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
    setLoading(false);
  }, [moduleSlug]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  return { lessons, loading, refetch: fetchLessons };
}
