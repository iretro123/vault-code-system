import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type VaultStatusEnum = "GREEN" | "YELLOW" | "RED";
export type RiskModeEnum = "CONSERVATIVE" | "STANDARD" | "AGGRESSIVE";

export interface VaultState {
  vault_status: VaultStatusEnum;
  risk_mode: RiskModeEnum;
  account_balance: number;
  daily_loss_limit: number;
  risk_remaining_today: number;
  max_contracts_allowed: number;
  max_trades_per_day: number;
  trades_remaining_today: number;
  open_trade: boolean;
  loss_streak: number;
  current_session_behavior: string;
  last_block_reason: string | null;
  session_paused: boolean;
  last_activity_at: string | null;
}

export interface VaultStateContextValue {
  state: VaultState;
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
}

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

const DEFAULT_STATE: VaultState = {
  vault_status: "RED",
  risk_mode: "STANDARD",
  account_balance: 0,
  daily_loss_limit: 0,
  risk_remaining_today: 0,
  max_contracts_allowed: 0,
  max_trades_per_day: 3,
  trades_remaining_today: 3,
  open_trade: false,
  loss_streak: 0,
  current_session_behavior: "intraday",
  last_block_reason: null,
  session_paused: false,
  last_activity_at: null,
};

const VaultStateContext = createContext<VaultStateContextValue>({
  state: DEFAULT_STATE,
  loading: true,
  refreshing: false,
  refetch: () => {},
});

export function VaultStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<VaultState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const hasData = useRef(false);
  const mounted = useRef(true);

  const fetchState = useCallback(async (isBackground = false) => {
    if (!userId || inFlight.current) return;
    inFlight.current = true;

    if (!isBackground && !hasData.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { data, error } = await supabase.rpc("get_or_create_vault_state", {
        _user_id: userId,
      });

      if (!mounted.current) return;

      if (error) {
        console.error("Error fetching vault state:", error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (data && data.length > 0) {
        const row = data[0];
        hasData.current = true;

        // Inactivity auto-pause: if session is active but last activity > 60 min ago, pause
        const lastActivity = (row as any).last_activity_at;
        let sessionPaused = (row as any).session_paused ?? false;
        let autoPaused = false;

        if (!sessionPaused && lastActivity) {
          const elapsed = Date.now() - new Date(lastActivity).getTime();
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            sessionPaused = true;
            autoPaused = true;
          }
        }

        // Persist auto-pause to DB if triggered
        if (autoPaused && userId) {
          supabase
            .from("vault_state")
            .update({ session_paused: true })
            .eq("user_id", userId)
            .then(() => {}); // fire-and-forget
        }

        setState({
          vault_status: row.vault_status as VaultStatusEnum,
          risk_mode: row.risk_mode as RiskModeEnum,
          account_balance: Number(row.account_balance),
          daily_loss_limit: Number(row.daily_loss_limit),
          risk_remaining_today: Number(row.risk_remaining_today),
          max_contracts_allowed: row.max_contracts_allowed,
          max_trades_per_day: row.max_trades_per_day,
          trades_remaining_today: row.trades_remaining_today,
          open_trade: row.open_trade,
          loss_streak: row.loss_streak,
          current_session_behavior: (row as any).current_session_behavior ?? "intraday",
          last_block_reason: (row as any).last_block_reason ?? null,
          session_paused: sessionPaused,
          last_activity_at: lastActivity ?? null,
        });
      }
    } catch (err) {
      console.error("VaultState fetch error:", err);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      inFlight.current = false;
    }
  }, [userId]);

  const refetch = useCallback(() => fetchState(true), [fetchState]);

  // Lifecycle
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (userId) fetchState(false);
  }, [userId, fetchState]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`vault-state-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vault_state", filter: `user_id=eq.${userId}` },
        () => fetchState(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchState]);

  return (
    <VaultStateContext.Provider value={{ state, loading, refreshing, refetch }}>
      {children}
    </VaultStateContext.Provider>
  );
}

export function useVaultState(): VaultStateContextValue {
  return useContext(VaultStateContext);
}
