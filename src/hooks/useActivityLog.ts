import { useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight activity logger for dispute/churn support.
 * Best-effort: silently catches errors so it never breaks UX.
 */
export function useActivityLog() {
  const { user } = useAuth();
  const userIdRef = useRef(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const logActivity = useCallback(
    async (
      event_name: string,
      page_key?: string | null,
      metadata?: Record<string, unknown> | null
    ) => {
      const uid = userIdRef.current;
      if (!uid) return;
      try {
        await supabase.from("user_activity_logs").insert({
          user_id: uid,
          event_name,
          page_key: page_key ?? null,
          metadata_json: metadata ?? null,
        });
      } catch {
        // best-effort — never throw
      }
    },
    []
  );

  return { logActivity };
}
