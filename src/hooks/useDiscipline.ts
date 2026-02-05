 // Re-export useTradePermission as the primary discipline hook
 // This maintains backward compatibility while using the database as single source of truth
 import { useTradePermission } from "./useTradePermission";
 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 interface DisciplineMetrics {
   disciplineStatus: "active" | "locked";
   disciplineScore: number;
   canTrade: boolean;
   canTradeReason: string;
   todayTradesUsed: number;
   todayTradesAllowed: number;
   todayLossUsed: number;
   todayLossAllowed: number;
   disciplineStreak: number;
   complianceRate: number;
   avgEmotionalState: number;
   hasExceededMaxTrades: boolean;
   hasExceededDailyLoss: boolean;
   hasRuleViolation: boolean;
   todayViolations: number;
   loading: boolean;
   refetch: () => void;
 }
 
 export function useDiscipline(): DisciplineMetrics {
   const { user } = useAuth();
   const permission = useTradePermission();
   const [additionalStats, setAdditionalStats] = useState({
     todayTradesUsed: 0,
     todayTradesAllowed: 3,
     todayLossUsed: 0,
     todayLossAllowed: 3,
     disciplineStreak: 0,
     complianceRate: 100,
     avgEmotionalState: 3,
     todayViolations: 0,
   });
   const [refreshKey, setRefreshKey] = useState(0);
 
   // Use a stable refetch that calls permission.refetch
   const refetch = useCallback(() => {
     setRefreshKey((k) => k + 1);
   }, []);
 
   // Sync refetch with permission refetch
   useEffect(() => {
     if (refreshKey > 0) {
       permission.refetch();
     }
   }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
 
   // Fetch additional stats from calculate_discipline_metrics for UI display
   useEffect(() => {
     if (!user) return;
 
     async function fetchStats() {
       try {
         const [metricsResult, rulesResult, entriesResult] = await Promise.all([
           supabase.rpc("calculate_discipline_metrics", { _user_id: user!.id }),
           supabase
             .from("trading_rules")
             .select("max_trades_per_day, max_daily_loss")
             .eq("user_id", user!.id)
             .maybeSingle(),
           supabase
             .from("trade_entries")
             .select("risk_used, followed_rules, emotional_state, trade_date")
             .eq("user_id", user!.id)
             .gte("trade_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
         ]);
 
         const dbMetrics = metricsResult.data?.[0];
         const rules = rulesResult.data;
         const entries = entriesResult.data || [];
 
         const today = new Date().toISOString().split("T")[0];
         const todayEntries = entries.filter((e) => e.trade_date === today);
         const todayLossUsed = todayEntries.reduce((sum, e) => sum + Number(e.risk_used), 0);
         const compliant = entries.filter((e) => e.followed_rules).length;
         const complianceRate = entries.length > 0 ? Math.round((compliant / entries.length) * 100) : 100;
         const avgEmotionalState = entries.length > 0 
           ? entries.reduce((sum, e) => sum + e.emotional_state, 0) / entries.length 
           : 3;
 
         setAdditionalStats({
           todayTradesUsed: dbMetrics?.trades_today ?? 0,
           todayTradesAllowed: rules?.max_trades_per_day ?? 3,
           todayLossUsed,
           todayLossAllowed: rules?.max_daily_loss ?? 3,
           disciplineStreak: dbMetrics?.streak_days ?? 0,
           complianceRate,
           avgEmotionalState,
           todayViolations: dbMetrics?.violations_today ?? 0,
         });
       } catch (error) {
         console.error("Error fetching additional stats:", error);
       }
     }
 
     fetchStats();
   }, [user, refreshKey]);
 
   // Derive computed values from permission (database authority)
   const hasExceededMaxTrades = permission.tradesRemaining <= 0;
   const hasExceededDailyLoss = permission.dailyLossRemaining <= 0;
   const hasRuleViolation = additionalStats.todayViolations > 0;
 
   return {
     disciplineStatus: permission.disciplineStatus,
     disciplineScore: permission.disciplineScore,
     canTrade: permission.canTrade,
     canTradeReason: permission.reason,
     todayTradesUsed: additionalStats.todayTradesUsed,
     todayTradesAllowed: additionalStats.todayTradesAllowed,
     todayLossUsed: additionalStats.todayLossUsed,
     todayLossAllowed: additionalStats.todayLossAllowed,
     disciplineStreak: additionalStats.disciplineStreak,
     complianceRate: additionalStats.complianceRate,
     avgEmotionalState: additionalStats.avgEmotionalState,
     hasExceededMaxTrades,
     hasExceededDailyLoss,
     hasRuleViolation,
     todayViolations: additionalStats.todayViolations,
     loading: permission.loading,
     refetch,
   };
 }