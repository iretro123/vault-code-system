 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface VaultStatus {
   canTrade: boolean;
   reason: string;
   disciplineScore: number;
   disciplineStatus: "active" | "locked";
   disciplineRank: "Undisciplined" | "Developing" | "Consistent" | "Elite";
   tradesToday: number;
   tradesRemaining: number;
   maxTradesPerDay: number;
   dailyLossUsed: number;
   dailyLossRemaining: number;
   maxDailyLoss: number;
   maxRiskPerTrade: number;
   streakDays: number;
   loading: boolean;
   refetch: () => void;
 }
 
 const DEFAULT_STATUS: Omit<VaultStatus, "refetch"> = {
   canTrade: false,
   reason: "Loading...",
   disciplineScore: 0,
   disciplineStatus: "locked",
   disciplineRank: "Undisciplined",
   tradesToday: 0,
   tradesRemaining: 0,
   maxTradesPerDay: 3,
   dailyLossUsed: 0,
   dailyLossRemaining: 0,
   maxDailyLoss: 3,
   maxRiskPerTrade: 1,
   streakDays: 0,
   loading: true,
 };
 
 /**
  * useVaultStatus - The single source of truth for all Vault OS decisions.
  * Calls the database authority function get_vault_status() via RPC.
  * All components must use this hook for discipline and trading data.
  */
 export function useVaultStatus(): VaultStatus {
   const { user } = useAuth();
   const [status, setStatus] = useState<Omit<VaultStatus, "refetch">>(DEFAULT_STATUS);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   // Fetch vault status from database authority function
   useEffect(() => {
     if (!user) {
       setStatus({
         ...DEFAULT_STATUS,
         loading: false,
         reason: "Not authenticated",
       });
       return;
     }
 
     async function fetchVaultStatus() {
       setStatus((prev) => ({ ...prev, loading: true }));
 
       try {
         const { data, error } = await supabase.rpc("get_vault_status", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching vault status:", error);
           setStatus({
             ...DEFAULT_STATUS,
             loading: false,
             reason: "Vault discipline lock active",
           });
           return;
         }
 
         if (data && data.length > 0) {
           const result = data[0];
           setStatus({
             canTrade: result.can_trade,
             reason: result.reason,
             disciplineScore: result.discipline_score,
             disciplineStatus: result.discipline_status === "active" ? "active" : "locked",
             disciplineRank: result.discipline_rank as VaultStatus["disciplineRank"],
             tradesToday: result.trades_today,
             tradesRemaining: result.trades_remaining,
             maxTradesPerDay: result.max_trades_per_day,
             dailyLossUsed: Number(result.daily_loss_used),
             dailyLossRemaining: Number(result.daily_loss_remaining),
             maxDailyLoss: Number(result.max_daily_loss),
             maxRiskPerTrade: Number(result.max_risk_per_trade),
             streakDays: result.streak_days,
             loading: false,
           });
         } else {
           setStatus({
             ...DEFAULT_STATUS,
             loading: false,
             reason: "No vault status data returned",
           });
         }
       } catch (error) {
         console.error("Error in fetchVaultStatus:", error);
         setStatus({
           ...DEFAULT_STATUS,
           loading: false,
           reason: "Vault status check failed",
         });
       }
     }
 
     fetchVaultStatus();
   }, [user, refreshKey]);
 
   // Real-time subscription for automatic refresh on data changes
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-status-updates")
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
           table: "trading_rules",
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
           console.log("Realtime: Subscribed to vault status updates");
         } else if (status === "CHANNEL_ERROR") {
           console.error("Realtime channel error:", err);
         }
       });
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...status, refetch };
 }