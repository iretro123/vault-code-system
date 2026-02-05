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

export function useVaultFocusStatus() {
  const { user } = useAuth();
  const userId = user?.id;

  const [data, setData] = useState<FocusStatus>({ active: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);

  // Return early when not authenticated
  useEffect(() => {
    if (!userId) {
      setData({ active: false });
      setLoading(false);
      setError(null);
    }
  }, [userId]);

  const fetchStatus = useCallback(async () => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("get_vault_focus_status", { _user_id: userId });

    if (error) {
      setError(error.message);
      setLoading(false);
      inFlight.current = false;
      return;
    }

    setData((data as FocusStatus) ?? { active: false });
    setLoading(false);
    inFlight.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchStatus();

    const ch = supabase
      .channel(`vault-focus-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vault_focus_sessions", filter: `user_id=eq.${userId}` },
        () => fetchStatus()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trade_entries", filter: `user_id=eq.${userId}` },
        () => fetchStatus()
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(ch);
    };
  }, [userId, fetchStatus]);

  return { data, loading, error, refetch: fetchStatus };
}
