import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type FocusStatus =
  | { active: false }
  | {
      active: true;
      session_id: string;
      ends_at: string;
      remaining_seconds: number;
      max_trades: number;
      trades_taken: number;
      trades_remaining: number;
      cooldown_after_loss_minutes: number;
      goals: string | null;
    };

const DEBOUNCE_MS = 300;

export function useVaultFocusStatus() {
  const { user } = useAuth();
  const userId = user?.id;

  const [data, setData] = useState<FocusStatus>({ active: false });
  const [loading, setLoading] = useState(true);     // True only on initial load
  const [refreshing, setRefreshing] = useState(false); // True during background refetch
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchStatus = useCallback(async (isBackground = false) => {
    if (!userId) {
      setData({ active: false });
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    // Only show loading on initial fetch with no cached data
    if (!isBackground && !hasData.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    const { data: result, error: fetchError } = await supabase.rpc("get_vault_focus_status", { _user_id: userId });

    inFlight.current = false;

    if (!mounted.current) return;

    if (fetchError) {
      // Keep existing data on error if we have it
      if (!hasData.current) {
        setError(fetchError.message);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    hasData.current = true;
    setData((result as FocusStatus) ?? { active: false });
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  // Debounced refetch for visibility changes
  const debouncedRefetch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchStatus(true);
    }, DEBOUNCE_MS);
  }, [fetchStatus]);

  // Reset state when user logs out
  useEffect(() => {
    if (!userId) {
      setData({ active: false });
      setLoading(false);
      setRefreshing(false);
      setError(null);
      hasData.current = false;
    }
  }, [userId]);

  // Cleanup
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Initial fetch + realtime + visibility
  useEffect(() => {
    if (!userId) return;

    fetchStatus(false);

    const ch = supabase
      .channel(`vault-focus-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vault_focus_sessions", filter: `user_id=eq.${userId}` },
        () => fetchStatus(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_entries", filter: `user_id=eq.${userId}` },
        () => fetchStatus(true)
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        debouncedRefetch();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(ch);
    };
  }, [userId, fetchStatus, debouncedRefetch]);

  return { data, loading, refreshing, error, refetch: () => fetchStatus(true) };
}
