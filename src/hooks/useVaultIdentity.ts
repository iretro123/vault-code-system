import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type VaultRank = "LOCKED" | "NOVICE" | "DEVELOPING" | "STRONG" | "ELITE";

export interface VaultIdentity {
  vaultScore: number;
  vaultLevel: number;
  vaultRank: VaultRank;
  vaultTitle: string;
  nextRank: string;
  progressPercent: number;
  rankColor: string;
  loading: boolean;       // True only on initial load with no data
  refreshing: boolean;    // True during background refetch
  error: string | null;
  refetch: () => void;
}

const DEFAULT_IDENTITY: Omit<VaultIdentity, "refetch"> = {
  vaultScore: 0,
  vaultLevel: 1,
  vaultRank: "LOCKED",
  vaultTitle: "Undisciplined",
  nextRank: "NOVICE",
  progressPercent: 0,
  rankColor: "destructive",
  loading: true,
  refreshing: false,
  error: null,
};

const DEBOUNCE_MS = 300;

/**
 * useVaultIdentity - Provides the trader's identity rank based on vault score.
 * Ranks: LOCKED → NOVICE → DEVELOPING → STRONG → ELITE
 */
export function useVaultIdentity(): VaultIdentity {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState<Omit<VaultIdentity, "refetch">>(DEFAULT_IDENTITY);

  const inFlight = useRef(false);
  const mounted = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const hasData = useRef(false);

  const fetchIdentity = useCallback(async (isBackground = false) => {
    if (!userId) {
      setData({ ...DEFAULT_IDENTITY, loading: false, refreshing: false, error: "Not authenticated" });
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    // Only show loading on initial fetch with no cached data
    if (!isBackground && !hasData.current) {
      setData((prev) => ({ ...prev, loading: true, error: null }));
    } else {
      setData((prev) => ({ ...prev, refreshing: true }));
    }

    try {
      const { data: result, error } = await supabase.rpc("get_vault_identity", {
        _user_id: userId,
      });

      if (!mounted.current) return;

      if (error) {
        console.error("Error fetching vault identity:", error);
        // Keep existing data on error if we have it
        setData((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false, 
          error: hasData.current ? null : "Failed to fetch identity" 
        }));
        return;
      }

      if (result && result.length > 0) {
        const row = result[0];
        hasData.current = true;
        setData({
          vaultScore: row.vault_score,
          vaultLevel: row.vault_level,
          vaultRank: row.vault_rank as VaultRank,
          vaultTitle: row.vault_title,
          nextRank: row.next_rank,
          progressPercent: Number(row.progress_percent),
          rankColor: row.rank_color,
          loading: false,
          refreshing: false,
          error: null,
        });
      } else {
        setData((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false, 
          error: hasData.current ? null : "No identity data" 
        }));
      }
    } catch (err) {
      console.error("Error in fetchIdentity:", err);
      if (mounted.current) {
        setData((prev) => ({ 
          ...prev, 
          loading: false, 
          refreshing: false, 
          error: hasData.current ? null : "Identity fetch failed" 
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
      fetchIdentity(true);
    }, DEBOUNCE_MS);
  }, [fetchIdentity]);

  const refetch = useCallback(() => {
    fetchIdentity(true);
  }, [fetchIdentity]);

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
      fetchIdentity(false);
    }
  }, [userId, fetchIdentity]);

  // Real-time subscription + visibility change
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`vault-identity-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_entries",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchIdentity(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_events",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchIdentity(true)
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
  }, [userId, fetchIdentity, debouncedRefetch]);

  return { ...data, refetch };
}
