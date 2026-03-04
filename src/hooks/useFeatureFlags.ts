import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  page_key: string;
  label: string;
  enabled: boolean;
}

export function useFeatureFlags() {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("page_key, label, enabled");
      if (error) throw error;
      return (data ?? []) as FeatureFlag[];
    },
    staleTime: 60_000,
  });

  const isPageEnabled = (pageKey: string) => {
    const flag = flags.find((f) => f.page_key === pageKey);
    return flag ? flag.enabled : true; // default to enabled if not found
  };

  return { flags, isPageEnabled, isLoading };
}
