import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyLesson {
  id: string;
  module_slug: string;
  module_title: string;
  lesson_title: string;
  video_url: string;
  notes: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
}

const CACHE_KEY = "va_cache_lessons";

function readCache(moduleSlug?: string): AcademyLesson[] {
  try {
    const raw = localStorage.getItem(moduleSlug ? `${CACHE_KEY}_${moduleSlug}` : CACHE_KEY);
    const parsed=raw?JSON.parse(raw):[];
    return Array.isArray(parsed)?parsed.filter(row=>row&&typeof row.id==='string'&&(!moduleSlug||row.module_slug===moduleSlug)):[];
  } catch {
    return [];
  }
}

export function useAcademyLessons(moduleSlug?: string) {
  const [lessons, setLessons] = useState<AcademyLesson[]>(() => readCache(moduleSlug));
  const [loading, setLoading] = useState(() => readCache(moduleSlug).length === 0);
  const [error,setError]=useState<string|null>(null);
  const request=useRef(0);

  const fetchLessons = useCallback(async () => {
    const ticket=++request.current;
    setLoading(readCache(moduleSlug).length===0);
    setError(null);
    try {
    let query = supabase
      .from("academy_lessons")
      .select("*")
      .order("module_slug")
      .order("sort_order");

    if (moduleSlug) {
      query = query.eq("module_slug", moduleSlug);
    }

    const { data,error:loadError } = await query;
    if(ticket!==request.current)return;
    if(loadError)throw loadError;
    const result = (data as AcademyLesson[]) || [];
    setLessons(result);
    const cacheKey = moduleSlug ? `${CACHE_KEY}_${moduleSlug}` : CACHE_KEY;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {
      // Storage may be full or unavailable; fetched lessons still work.
    }
    }catch{if(ticket===request.current)setError('Lessons couldn’t load. Please try again.');}
    finally{if(ticket===request.current)setLoading(false);}
  }, [moduleSlug]);

  useEffect(() => {
    setLessons(readCache(moduleSlug));
    fetchLessons();
    // Keep an open course in sync with edits made in Lovable/admin. Focus and
    // reconnect also recover changes when Realtime is unavailable on the server.
    let refreshTimer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void fetchLessons(), 250);
    };
    const channel = supabase.channel(`lesson-content:${moduleSlug || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'academy_lessons' }, refresh)
      .subscribe();
    // The current backend does not publish lesson changes to Realtime yet.
    // Poll only while visible so existing installations still receive edits.
    const refreshVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const poll = setInterval(refreshVisible, 60_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshVisible);
    return()=>{
      request.current++;
      clearTimeout(refreshTimer);
      clearInterval(poll);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshVisible);
      void supabase.removeChannel(channel);
    };
  }, [fetchLessons,moduleSlug]);

  return { lessons, loading, error, refetch: fetchLessons };
}
