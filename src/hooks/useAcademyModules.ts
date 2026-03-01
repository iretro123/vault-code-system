import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  sort_order: number;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

const CACHE_KEY = "va_cache_modules";

function readCache(): AcademyModule[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useAcademyModules() {
  const [modules, setModules] = useState<AcademyModule[]>(() => readCache());
  const [loading, setLoading] = useState(() => readCache().length === 0);

  const fetchModules = useCallback(async () => {
    if (modules.length === 0) setLoading(true);
    const { data } = await supabase
      .from("academy_modules")
      .select("*")
      .order("sort_order");
    const result = (data as AcademyModule[]) || [];
    setModules(result);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return { modules, loading, refetch: fetchModules };
}
