import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AcademyModule {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useAcademyModules() {
  const [modules, setModules] = useState<AcademyModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("academy_modules")
      .select("*")
      .order("sort_order");
    setModules((data as AcademyModule[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return { modules, loading, refetch: fetchModules };
}
