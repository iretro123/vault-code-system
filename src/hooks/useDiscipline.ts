 import { useState, useEffect, useMemo } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 interface TradingRules {
   max_risk_per_trade: number;
   max_trades_per_day: number;
   max_daily_loss: number;
   allowed_sessions: string[];
   forbidden_behaviors: string[];
 }
 
interface DbMetrics {
  discipline_status: string;
  discipline_score: number;
  can_trade: boolean;
  trades_today: number;
  violations_today: number;
  streak_days: number;
 }
 
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
 
 const DEFAULT_METRICS: DisciplineMetrics = {
   disciplineStatus: "locked",
   disciplineScore: 0,
   canTrade: false,
   canTradeReason: "Loading...",
   todayTradesUsed: 0,
   todayTradesAllowed: 3,
   todayLossUsed: 0,
   todayLossAllowed: 3,
   disciplineStreak: 0,
   complianceRate: 0,
   avgEmotionalState: 3,
   hasExceededMaxTrades: false,
   hasExceededDailyLoss: false,
   hasRuleViolation: false,
   todayViolations: 0,
   loading: true,
   refetch: () => {},
 };
 
 export function useDiscipline(): DisciplineMetrics {
   const { user } = useAuth();
   const [rules, setRules] = useState<TradingRules | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DbMetrics | null>(null);
  const [todayLossUsed, setTodayLossUsed] = useState(0);
  const [complianceRate, setComplianceRate] = useState(100);
  const [avgEmotionalState, setAvgEmotionalState] = useState(3);
   const [loading, setLoading] = useState(true);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = () => setRefreshKey(k => k + 1);
 
  // Fetch data from database
   useEffect(() => {
     if (!user) {
       setLoading(false);
       return;
     }
 
     async function fetchData() {
       try {
        const [rulesResult, metricsResult, statsResult] = await Promise.all([
          // Fetch trading rules
          supabase
            .from("trading_rules")
            .select("*")
            .eq("user_id", user!.id)
            .maybeSingle(),
          // Call the database function for core metrics
          supabase.rpc("calculate_discipline_metrics", { _user_id: user!.id }),
          // Fetch today's loss and 30-day stats for additional metrics
          fetchAdditionalStats(user!.id),
        ]);
 
        setRules(rulesResult.data);
        
        if (metricsResult.data && metricsResult.data.length > 0) {
          setDbMetrics(metricsResult.data[0]);
        }
 
        if (statsResult) {
          setTodayLossUsed(statsResult.todayLoss);
          setComplianceRate(statsResult.compliance);
          setAvgEmotionalState(statsResult.avgEmotion);
        }
       } catch (error) {
         console.error("Error fetching discipline data:", error);
       } finally {
         setLoading(false);
       }
     }
 
    async function fetchAdditionalStats(userId: string) {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: entries } = await supabase
        .from("trade_entries")
        .select("risk_used, followed_rules, emotional_state, trade_date")
        .eq("user_id", userId)
        .gte("trade_date", thirtyDaysAgo.toISOString().split("T")[0]);

      if (!entries || entries.length === 0) {
        return { todayLoss: 0, compliance: 100, avgEmotion: 3 };
      }

      const todayEntries = entries.filter(e => e.trade_date === today);
      const todayLoss = todayEntries.reduce((sum, e) => sum + Number(e.risk_used), 0);
      const compliant = entries.filter(e => e.followed_rules).length;
      const compliance = Math.round((compliant / entries.length) * 100);
      const avgEmotion = entries.reduce((sum, e) => sum + e.emotional_state, 0) / entries.length;

      return { todayLoss, compliance, avgEmotion };
    }

     fetchData();
   }, [user, refreshKey]);
 
  // Real-time subscription for trade entries
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("discipline-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_entries",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch when trades change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

   const metrics = useMemo((): DisciplineMetrics => {
     if (loading || !user) {
       return { ...DEFAULT_METRICS, refetch };
     }
 
     if (!rules) {
       return {
         ...DEFAULT_METRICS,
         loading: false,
         canTradeReason: "Set your trading rules first",
         refetch,
       };
     }
 
    // Use database metrics as primary source
    const disciplineScore = dbMetrics?.discipline_score ?? 0;
    const disciplineStatus = (dbMetrics?.discipline_status === "active" ? "active" : "locked") as "active" | "locked";
    const canTrade = dbMetrics?.can_trade ?? false;
    const todayTradesUsed = dbMetrics?.trades_today ?? 0;
    const todayViolations = dbMetrics?.violations_today ?? 0;
    const disciplineStreak = dbMetrics?.streak_days ?? 0;

     const todayTradesAllowed = rules.max_trades_per_day;
     const todayLossAllowed = rules.max_daily_loss;
 
     const hasExceededMaxTrades = todayTradesUsed >= todayTradesAllowed;
     const hasExceededDailyLoss = todayLossUsed >= todayLossAllowed;
     const hasRuleViolation = todayViolations > 0;
 
    // Generate reason for canTrade status
     let canTradeReason = "All systems clear";
    if (!canTrade) {
      if (hasExceededMaxTrades) {
        canTradeReason = `Max trades reached (${todayTradesUsed}/${todayTradesAllowed})`;
      } else if (hasExceededDailyLoss) {
        canTradeReason = `Daily loss limit reached (${todayLossUsed.toFixed(1)}%/${todayLossAllowed}%)`;
      } else if (hasRuleViolation) {
        canTradeReason = `Rule violation detected today`;
      } else if (disciplineStatus === "locked") {
        canTradeReason = "Discipline score too low";
      }
     }
 
     return {
       disciplineStatus,
       disciplineScore,
       canTrade,
       canTradeReason,
       todayTradesUsed,
       todayTradesAllowed,
       todayLossUsed,
       todayLossAllowed,
       disciplineStreak,
       complianceRate,
       avgEmotionalState,
       hasExceededMaxTrades,
       hasExceededDailyLoss,
       hasRuleViolation,
       todayViolations,
       loading: false,
       refetch,
     };
  }, [user, rules, dbMetrics, todayLossUsed, complianceRate, avgEmotionalState, loading]);
 
   return metrics;
 }