 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export type VaultTier = "ELITE" | "STRONG" | "DEVELOPING" | "DANGEROUS" | "LOCKED";
 export type VaultTrend = "improving" | "stable" | "declining";
 
 export interface VaultScore {
   score: number;
   tier: VaultTier;
   trend: VaultTrend;
   components: {
     discipline: number;
     adherence: number;
     violation: number;
     risk: number;
     emotion: number;
   };
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const DEFAULT_SCORE: Omit<VaultScore, "refetch"> = {
   score: 0,
   tier: "LOCKED",
   trend: "stable",
   components: {
     discipline: 0,
     adherence: 0,
     violation: 0,
     risk: 0,
     emotion: 0,
   },
   loading: true,
   error: null,
 };
 
 /**
  * useVaultScore - Primary authority metric for Vault OS.
  * Calculates comprehensive score from discipline, adherence, violations, risk, and emotion.
  */
 export function useVaultScore(): VaultScore {
   const { user } = useAuth();
   const [data, setData] = useState<Omit<VaultScore, "refetch">>(DEFAULT_SCORE);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   // Fetch vault score
   useEffect(() => {
     if (!user) {
       setData({ ...DEFAULT_SCORE, loading: false, error: "Not authenticated" });
       return;
     }
 
     async function fetchScore() {
       setData((prev) => ({ ...prev, loading: true, error: null }));
 
       try {
         const { data: result, error } = await supabase.rpc("calculate_vault_score", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error calculating vault score:", error);
           setData({ ...DEFAULT_SCORE, loading: false, error: "Failed to calculate score" });
           return;
         }
 
         if (result && result.length > 0) {
           const row = result[0];
           setData({
             score: row.score,
             tier: row.tier as VaultTier,
             trend: row.trend as VaultTrend,
             components: {
               discipline: Number(row.discipline_component),
               adherence: Number(row.adherence_component),
               violation: Number(row.violation_component),
               risk: Number(row.risk_component),
               emotion: Number(row.emotion_component),
             },
             loading: false,
             error: null,
           });
         } else {
           setData({ ...DEFAULT_SCORE, loading: false, error: "No score data returned" });
         }
       } catch (err) {
         console.error("Error in fetchScore:", err);
         setData({ ...DEFAULT_SCORE, loading: false, error: "Score calculation failed" });
       }
     }
 
     fetchScore();
   }, [user, refreshKey]);
 
   // Real-time subscription for instant updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-score-updates")
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
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "profiles",
           filter: `user_id=eq.${user.id}`,
         },
         () => refetch()
       )
       .subscribe((status, err) => {
         if (status === "SUBSCRIBED") {
           console.log("Realtime: Subscribed to vault score updates");
         } else if (status === "CHANNEL_ERROR") {
           console.error("Realtime channel error:", err);
         }
       });
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...data, refetch };
 }