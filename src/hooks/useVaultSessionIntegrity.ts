import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SessionIntegrity = {
  trades_today: number;
  verified_trades_today: number;
  integrity_percent: number;
};

type State = {
  loading: boolean;
  error: string | null;
  data: SessionIntegrity | null;
};

export function useVaultSessionIntegrity() {
  const { user } = useAuth();
  const userId = user?.id;

  const [state, setState] = useState<State>({ loading: true, error: null, data: null });

  // Prevent overlapping fetches + avoid setState after unmount
  const inFlight = useRef(false);
  const alive = useRef(true);

  const fetchIntegrity = useCallback(async () => {
    if (!userId) return;
    if (inFlight.current) return;

    inFlight.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));

    const { data, error } = await supabase.rpc("get_vault_session_integrity", { _user_id: userId });

    if (!alive.current) return;

    if (error) {
      setState({ loading: false, error: error.message, data: null });
    } else {
      const row = (Array.isArray(data) ? data[0] : data) as SessionIntegrity | undefined;
      setState({
        loading: false,
        error: null,
        data: row ?? { trades_today: 0, verified_trades_today: 0, integrity_percent: 100 },
      });
    }

    inFlight.current = false;
  }, [userId]);

  // FAST refresh triggers:
  // 1) initial load
  // 2) realtime trade_entries changes
  // 3) refetch when tab becomes visible again (no stale state after user switches apps)
  useEffect(() => {
    alive.current = true;
    if (!userId) return;

    fetchIntegrity();

    const channel = supabase
      .channel(`vault-integrity-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_entries", filter: `user_id=eq.${userId}` },
        () => fetchIntegrity()
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchIntegrity();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, fetchIntegrity]);

  const derived = useMemo(() => {
    const d = state.data;
    if (!d) return { trades: 0, verified: 0, integrity: 0 };
    return { trades: d.trades_today, verified: d.verified_trades_today, integrity: d.integrity_percent };
  }, [state.data]);

  return { ...state, ...derived, refetch: fetchIntegrity };
}
