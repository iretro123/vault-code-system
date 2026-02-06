import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface VaultLevel {
  level: number;
  xp: number;
  xpToNextLevel: number;
  progressPercent: number;
  title: string;
  rank: string;
  nextTitle: string;
  loading: boolean;       // True only on initial load with no data
  refreshing: boolean;    // True during background refetch
  refetch: () => void;
}

const DEFAULT_LEVEL: Omit<VaultLevel, "refetch"> = {
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  progressPercent: 0,
  title: "Novice 1",
  rank: "Novice",
  nextTitle: "Novice 2",
  loading: true,
  refreshing: false,
};

const DEBOUNCE_MS = 300;

export function useVaultLevel(): VaultLevel {
  const { user } = useAuth();
  const userId = user?.id;
  const [levelData, setLevelData] = useState<Omit<VaultLevel, "refetch">>(DEFAULT_LEVEL);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchVaultLevel = useCallback(async (isBackground = false) => {
    if (!userId) {
      setLevelData({ ...DEFAULT_LEVEL, loading: false, refreshing: false });
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    // Only show loading on initial fetch with no cached data
    if (!isBackground && !hasData.current) {
      setLevelData((prev) => ({ ...prev, loading: true }));
    } else {
      setLevelData((prev) => ({ ...prev, refreshing: true }));
    }

    try {
      const { data, error } = await supabase.rpc("calculate_vault_level", {
        _user_id: userId,
      });

      if (!mounted.current) return;

      if (error) {
        console.error("Error fetching vault level:", error);
        // Keep existing data on error
        setLevelData((prev) => ({ ...prev, loading: false, refreshing: false }));
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        hasData.current = true;
        setLevelData({
          level: result.vault_level,
          xp: Number(result.vault_xp),
          xpToNextLevel: Number(result.xp_to_next_level),
          progressPercent: Number(result.progress_percent),
          title: result.level_title || "Novice 1",
          rank: result.level_rank || "Novice",
          nextTitle: result.next_level_title || "Novice 2",
          loading: false,
          refreshing: false,
        });
      } else {
        setLevelData((prev) => ({ ...prev, loading: false, refreshing: false }));
      }
    } catch (error) {
      console.error("Error in fetchVaultLevel:", error);
      if (mounted.current) {
        setLevelData((prev) => ({ ...prev, loading: false, refreshing: false }));
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
      fetchVaultLevel(true);
    }, DEBOUNCE_MS);
  }, [fetchVaultLevel]);

  const refetch = useCallback(() => {
    fetchVaultLevel(true);
  }, [fetchVaultLevel]);

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
      fetchVaultLevel(false);
    }
  }, [userId, fetchVaultLevel]);

  // Real-time subscription + visibility change
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`vault-level-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_entries",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchVaultLevel(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_events",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchVaultLevel(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pre_trade_checks",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchVaultLevel(true)
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
  }, [userId, fetchVaultLevel, debouncedRefetch]);

  return { ...levelData, refetch };
}
