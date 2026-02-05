 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export type ConsistencyLevel = "EXCELLENT" | "GOOD" | "DEVELOPING" | "UNSTABLE" | "CRITICAL";
 export type TrendDirection = "IMPROVING" | "STABLE" | "DECLINING" | "COLLAPSING";
 
 export interface VaultConsistencyStatus {
   consistencyScore: number;
   consistencyLevel: ConsistencyLevel;
   trendDirection: TrendDirection;
   disciplineVelocity: number;
   riskVelocity: number;
   emotionalStability: number;
   violationTrend: number;
   interventionRequired: boolean;
   recommendedRiskModifier: number;
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const DEFAULT_STATUS: Omit<VaultConsistencyStatus, "refetch"> = {
   consistencyScore: 70,
   consistencyLevel: "GOOD",
   trendDirection: "STABLE",
   disciplineVelocity: 0,
   riskVelocity: 0,
   emotionalStability: 100,
   violationTrend: 0,
   interventionRequired: false,
   recommendedRiskModifier: 1.0,
   loading: true,
   error: null,
 };
 
 /**
  * useVaultConsistencyStatus - Detects discipline deterioration trends early
  * and applies preventive intervention BEFORE protection mode or discipline lock.
  */
 export function useVaultConsistencyStatus(): VaultConsistencyStatus {
   const { user } = useAuth();
   const [data, setData] = useState<Omit<VaultConsistencyStatus, "refetch">>(DEFAULT_STATUS);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setData({ ...DEFAULT_STATUS, loading: false, error: "Not authenticated" });
       return;
     }
 
     async function fetchConsistencyStatus() {
       setData((prev) => ({ ...prev, loading: true, error: null }));
 
       try {
         const { data: result, error } = await supabase.rpc("get_vault_consistency_status", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching consistency status:", error);
           setData({ ...DEFAULT_STATUS, loading: false, error: "Failed to fetch consistency status" });
           return;
         }
 
         if (result && result.length > 0) {
           const row = result[0];
           setData({
             consistencyScore: row.consistency_score,
             consistencyLevel: row.consistency_level as ConsistencyLevel,
             trendDirection: row.trend_direction as TrendDirection,
             disciplineVelocity: Number(row.discipline_velocity),
             riskVelocity: Number(row.risk_velocity),
             emotionalStability: Number(row.emotional_stability),
             violationTrend: Number(row.violation_trend),
             interventionRequired: row.intervention_required,
             recommendedRiskModifier: Number(row.recommended_risk_modifier),
             loading: false,
             error: null,
           });
         } else {
           setData({ ...DEFAULT_STATUS, loading: false, error: "No consistency data" });
         }
       } catch (err) {
         console.error("Error in fetchConsistencyStatus:", err);
         setData({ ...DEFAULT_STATUS, loading: false, error: "Consistency status fetch failed" });
       }
     }
 
     fetchConsistencyStatus();
   }, [user, refreshKey]);
 
   // Real-time subscription for instant updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-consistency-updates")
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