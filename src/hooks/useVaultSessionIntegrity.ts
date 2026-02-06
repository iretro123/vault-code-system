import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SessionIntegrity = {
  trades_today: number;
  verified_trades_today: number;
  integrity_percent: number;
};

type State = {
  loading: boolean;     // True only on initial load with no data
  refreshing: boolean;  // True during background refetch
  error: string | null;
  data: SessionIntegrity | null;
};

const DEBOUNCE_MS = 300;

export function useVaultSessionIntegrity() {
  const { user } = useAuth();
  const userId = user?.id;

  const [state, setState] = useState<State>({ 
    loading: true, 
    refreshing: false, 
    error: null, 
    data: null 
  });

  // Prevent overlapping fetches + avoid setState after unmount
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchIntegrity = useCallback(async (isBackground = false) => {
    if (!userId) {
      setState({ loading: false, refreshing: false, error: null, data: null });
      return;
    }
    if (inFlight.current) return;

    inFlight.current = true;

    // Only show loading on initial fetch with no cached data
    if (!isBackground && !hasData.current) {
      setState((s) => ({ ...s, loading: true, error: null }));
    } else {
      setState((s) => ({ ...s, refreshing: true }));
    }

    const { data, error } = await supabase.rpc("get_vault_session_integrity", { _user_id: userId });

    if (!mounted.current) {
      inFlight.current = false;
      return;
    }

    if (error) {
      // Keep existing data on error if we have it
      setState((s) => ({ 
        ...s, 
        loading: false, 
        refreshing: false, 
        error: hasData.current ? null : error.message 
      }));
    } else {
      const row = (Array.isArray(data) ? data[0] : data) as SessionIntegrity | undefined;
      const result = row ?? { trades_today: 0, verified_trades_today: 0, integrity_percent: 100 };
      hasData.current = true;
      setState({
        loading: false,
        refreshing: false,
        error: null,
        data: result,
      });
    }

    inFlight.current = false;
  }, [userId]);

  // Debounced refetch for visibility changes
  const debouncedRefetch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchIntegrity(true);
    }, DEBOUNCE_MS);
  }, [fetchIntegrity]);

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

    fetchIntegrity(false);

    const channel = supabase
      .channel(`vault-integrity-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_entries", filter: `user_id=eq.${userId}` },
        () => fetchIntegrity(true)
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
      supabase.removeChannel(channel);
    };
  }, [userId, fetchIntegrity, debouncedRefetch]);

  const derived = useMemo(() => {
    const d = state.data;
    if (!d) return { trades: 0, verified: 0, integrity: 0 };
    return { trades: d.trades_today, verified: d.verified_trades_today, integrity: d.integrity_percent };
  }, [state.data]);

  return { ...state, ...derived, refetch: () => fetchIntegrity(true) };
}
