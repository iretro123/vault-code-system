import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyLesson {
  id: string;
  module_slug: string;
  module_title: string;
  lesson_title: string;
  video_url: string;
  sort_order: number;
  created_at: string;
}

export function useAcademyLessons(moduleSlug?: string) {
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("academy_lessons")
      .select("*")
      .order("module_slug")
      .order("sort_order");

    if (moduleSlug) {
      query = query.eq("module_slug", moduleSlug);
    }

    const { data } = await query;
    setLessons((data as AcademyLesson[]) || []);
    setLoading(false);
  }, [moduleSlug]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  return { lessons, loading, refetch: fetchLessons };
}
