import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE_THRESHOLD = 5 * 60_000; // 5 minutes

export function useSmartRefresh() {
  const queryClient = useQueryClient();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = async () => {
      // Reconnect realtime channels with fresh token
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        supabase.realtime.setAuth(token);
      }

      // Silently refetch only active/mounted queries — no cache reset, no loading states
      queryClient.refetchQueries({ type: "active" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const elapsed = hiddenAtRef.current
          ? Date.now() - hiddenAtRef.current
          : 0;
        if (elapsed >= STALE_THRESHOLD) refresh();
        hiddenAtRef.current = null;
      }
    };

    const onOnline = () => refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);
}
