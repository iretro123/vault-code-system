import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current user has the `basic_tier` role.
 * basic_tier = video-only membership, isolated from the full Vault OS app.
 */
export function useIsBasicTier() {
  const { user, loading: authLoading } = useAuth();
  const [isBasic, setIsBasic] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setIsBasic(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "basic_tier")
        .maybeSingle();
      if (!cancelled) setIsBasic(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isBasicTier: isBasic === true, loading: authLoading || isBasic === null };
}
