 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface TradePermission {
   canTrade: boolean;
   reason: string;
   disciplineScore: number;
   disciplineStatus: "active" | "locked";
   tradesRemaining: number;
   dailyLossRemaining: number;
   maxRiskPerTrade: number;
   loading: boolean;
   refetch: () => void;
 }
 
 const DEFAULT_PERMISSION: TradePermission = {
   canTrade: false,
   reason: "Loading...",
   disciplineScore: 0,
   disciplineStatus: "locked",
   tradesRemaining: 0,
   dailyLossRemaining: 0,
   maxRiskPerTrade: 1,
   loading: true,
   refetch: () => {},
 };
 
 export function useTradePermission(): TradePermission {
   const { user } = useAuth();
   const [permission, setPermission] = useState<Omit<TradePermission, "refetch">>(DEFAULT_PERMISSION);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   // Fetch permission from database authority function
   useEffect(() => {
     if (!user) {
       setPermission({
         ...DEFAULT_PERMISSION,
         loading: false,
         reason: "Not authenticated",
       });
       return;
     }
 
     async function fetchPermission() {
       setPermission((prev) => ({ ...prev, loading: true }));
 
       try {
         const { data, error } = await supabase.rpc("check_trade_permission", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching trade permission:", error);
           setPermission({
             canTrade: false,
             reason: "Failed to check permission",
             disciplineScore: 0,
             disciplineStatus: "locked",
             tradesRemaining: 0,
             dailyLossRemaining: 0,
             maxRiskPerTrade: 1,
             loading: false,
           });
           return;
         }
 
         if (data && data.length > 0) {
           const result = data[0];
           setPermission({
             canTrade: result.can_trade,
             reason: result.reason,
             disciplineScore: result.discipline_score,
             disciplineStatus: result.discipline_status === "active" ? "active" : "locked",
             tradesRemaining: result.trades_remaining,
             dailyLossRemaining: Number(result.daily_loss_remaining),
             maxRiskPerTrade: Number(result.max_risk_per_trade),
             loading: false,
           });
         } else {
           setPermission({
             canTrade: false,
             reason: "No permission data returned",
             disciplineScore: 0,
             disciplineStatus: "locked",
             tradesRemaining: 0,
             dailyLossRemaining: 0,
             maxRiskPerTrade: 1,
             loading: false,
           });
         }
       } catch (error) {
         console.error("Error in fetchPermission:", error);
         setPermission({
           canTrade: false,
           reason: "Permission check failed",
           disciplineScore: 0,
           disciplineStatus: "locked",
           tradesRemaining: 0,
           dailyLossRemaining: 0,
           maxRiskPerTrade: 1,
           loading: false,
         });
       }
     }
 
     fetchPermission();
   }, [user, refreshKey]);
 
   // Real-time subscription to trade_entries for automatic refresh
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("permission-updates")
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "trade_entries",
           filter: `user_id=eq.${user.id}`,
         },
         () => {
           refetch();
         }
       )
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "trading_rules",
           filter: `user_id=eq.${user.id}`,
         },
         () => {
           refetch();
         }
       )
       .subscribe((status, err) => {
         if (status === "SUBSCRIBED") {
           console.log("Realtime: Subscribed to permission updates");
         } else if (status === "CHANNEL_ERROR") {
           console.error("Realtime channel error:", err);
         }
       });
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...permission, refetch };
 }