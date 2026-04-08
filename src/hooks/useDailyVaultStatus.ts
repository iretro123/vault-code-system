import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DailyVaultStatus {
  vaultOpen: boolean;
  checklistCompleted: boolean;
  tradesToday: number;
  maxTrades: number;
  disciplineScore: number;
  vaultScore: number;
  vaultLevel: number;
  actionsRemaining: number;
  checklistId: string | null;
  loading: boolean;       // True only on initial load with no data
  refreshing: boolean;    // True during background refetch
  refetch: () => void;
}

const DEFAULT_STATUS: Omit<DailyVaultStatus, "refetch"> = {
  vaultOpen: false,
  checklistCompleted: false,
  tradesToday: 0,
  maxTrades: 3,
  disciplineScore: 0,
  vaultScore: 0,
  vaultLevel: 1,
  actionsRemaining: 5,
  checklistId: null,
  loading: true,
  refreshing: false,
};

const DEBOUNCE_MS = 300;

export function useDailyVaultStatus(): DailyVaultStatus {
  const { user } = useAuth();
  const userId = user?.id;
  const [status, setStatus] = useState<Omit<DailyVaultStatus, "refetch">>(DEFAULT_STATUS);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchDailyStatus = useCallback(async (isBackground = false) => {
    if (!userId) {
      setStatus({ ...DEFAULT_STATUS, loading: false, refreshing: false });
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    // Only show loading on initial fetch with no cached data
    if (!isBackground && !hasData.current) {
      setStatus((prev) => ({ ...prev, loading: true }));
    } else {
      setStatus((prev) => ({ ...prev, refreshing: true }));
    }

    try {
      const { data, error } = await supabase.rpc("get_daily_vault_status", {
        _user_id: userId,
      });

      if (!mounted.current) return;

      if (error) {
        console.error("Error fetching daily vault status:", error);
        // Keep existing data on error if we have it
        setStatus((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false 
        }));
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        hasData.current = true;
        setStatus({
          vaultOpen: result.vault_open,
          checklistCompleted: result.daily_checklist_completed,
          tradesToday: result.trades_taken_today,
          maxTrades: result.max_trades_allowed,
          disciplineScore: result.discipline_score,
          vaultScore: result.vault_score,
          vaultLevel: result.vault_level,
          actionsRemaining: result.required_actions_remaining,
          checklistId: result.checklist_id,
          loading: false,
          refreshing: false,
        });
      } else {
        setStatus((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false 
        }));
      }
    } catch (error) {
      console.error("Error in fetchDailyStatus:", error);
      if (mounted.current) {
        setStatus((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false 
        }));
      }
    } finally {
      inFlight.current = false;
    }
  }, [userId]);

  // Debounced refetch for visibility changes
  const debouncedRefetch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchDailyStatus(true);
    }, DEBOUNCE_MS);
  }, [fetchDailyStatus]);

  const refetch = useCallback(() => {
    fetchDailyStatus(true);
  }, [fetchDailyStatus]);

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

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchDailyStatus(false);
    }
  }, [userId, fetchDailyStatus]);

  // Real-time subscription + visibility change
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`daily-vault-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_daily_checklist",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchDailyStatus(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_entries",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchDailyStatus(true)
      )
      .subscribe();

    // No per-hook visibility listener — useSmartRefresh handles global resume

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchDailyStatus, debouncedRefetch]);

  return { ...status, refetch };
}

// Hook to complete the daily checklist
export function useCompleteDailyChecklist() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const completeChecklist = async (data: {
    mentalState: number;
    sleepQuality: number;
    emotionalControl: number;
    planReviewed: boolean;
    riskConfirmed: boolean;
  }): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.rpc("complete_daily_checklist", {
        _user_id: user.id,
        _mental_state: data.mentalState,
        _sleep_quality: data.sleepQuality,
        _emotional_control: data.emotionalControl,
        _plan_reviewed: data.planReviewed,
        _risk_confirmed: data.riskConfirmed,
      });

      if (error) {
        console.error("Error completing checklist:", error);
        return { success: false, message: error.message };
      }

      if (result && result.length > 0) {
        return { success: result[0].success, message: result[0].message };
      }

      return { success: false, message: "Unknown error" };
    } catch (error) {
      console.error("Error in completeChecklist:", error);
      return { success: false, message: "Failed to complete checklist" };
    } finally {
      setLoading(false);
    }
  };

  return { completeChecklist, loading };
}
