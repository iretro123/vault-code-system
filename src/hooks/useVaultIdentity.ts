 import { useState, useEffect, useCallback } from "react";
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
   loading: boolean;
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
   error: null,
 };
 
 /**
  * useVaultIdentity - Provides the trader's identity rank based on vault score.
  * Ranks: LOCKED → NOVICE → DEVELOPING → STRONG → ELITE
  */
 export function useVaultIdentity(): VaultIdentity {
   const { user } = useAuth();
   const [data, setData] = useState<Omit<VaultIdentity, "refetch">>(DEFAULT_IDENTITY);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setData({ ...DEFAULT_IDENTITY, loading: false, error: "Not authenticated" });
       return;
     }
 
     async function fetchIdentity() {
       setData((prev) => ({ ...prev, loading: true, error: null }));
 
       try {
         const { data: result, error } = await supabase.rpc("get_vault_identity", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching vault identity:", error);
           setData({ ...DEFAULT_IDENTITY, loading: false, error: "Failed to fetch identity" });
           return;
         }
 
         if (result && result.length > 0) {
           const row = result[0];
           setData({
             vaultScore: row.vault_score,
             vaultLevel: row.vault_level,
             vaultRank: row.vault_rank as VaultRank,
             vaultTitle: row.vault_title,
             nextRank: row.next_rank,
             progressPercent: Number(row.progress_percent),
             rankColor: row.rank_color,
             loading: false,
             error: null,
           });
         } else {
           setData({ ...DEFAULT_IDENTITY, loading: false, error: "No identity data" });
         }
       } catch (err) {
         console.error("Error in fetchIdentity:", err);
         setData({ ...DEFAULT_IDENTITY, loading: false, error: "Identity fetch failed" });
       }
     }
 
     fetchIdentity();
   }, [user, refreshKey]);
 
   // Real-time subscription for identity updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-identity-updates")
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "trade_entries",
           filter: `user_id=eq.${user.id}`,
         },
         () => refetch()
       )
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "vault_events",
           filter: `user_id=eq.${user.id}`,
         },
         () => refetch()
       )
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...data, refetch };
 }