import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const HEARTBEAT_INTERVAL = 120_000; // 120s

/**
 * Updates profiles.last_seen_at every 60s while the tab is visible.
 * Pauses when tab is hidden. Call once in a top-level layout.
 */
export function usePresenceHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const beat = () => {
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .then(() => {});
    };

    const start = () => {
      beat(); // immediate
      if (!intervalRef.current) {
        intervalRef.current = setInterval(beat, HEARTBEAT_INTERVAL);
      }
    };

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id]);
}
