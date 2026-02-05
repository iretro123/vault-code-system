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
 
 interface TradeEntry {
   id: string;
   trade_date: string;
   risk_used: number;
   risk_reward: number;
   followed_rules: boolean;
   emotional_state: number;
   created_at: string;
 }
 
 interface DisciplineMetrics {
   // Core status
   disciplineStatus: "active" | "locked";
   disciplineScore: number;
   canTrade: boolean;
   canTradeReason: string;
   
   // Today's metrics
   todayTradesUsed: number;
   todayTradesAllowed: number;
   todayLossUsed: number;
   todayLossAllowed: number;
   
   // Streak & compliance
   disciplineStreak: number;
   complianceRate: number;
   avgEmotionalState: number;
   
   // Violations
   hasExceededMaxTrades: boolean;
   hasExceededDailyLoss: boolean;
   hasRuleViolation: boolean;
   todayViolations: number;
   
   // Loading
   loading: boolean;
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
 };
 
 export function useDiscipline(): DisciplineMetrics {
   const { user } = useAuth();
   const [rules, setRules] = useState<TradingRules | null>(null);
   const [entries, setEntries] = useState<TradeEntry[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (!user) {
       setLoading(false);
       return;
     }
 
     async function fetchData() {
       try {
         // Fetch trading rules
         const { data: rulesData } = await supabase
           .from("trading_rules")
           .select("*")
           .eq("user_id", user!.id)
           .maybeSingle();
 
         // Fetch last 30 days of trade entries for calculations
         const thirtyDaysAgo = new Date();
         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
         
         const { data: entriesData } = await supabase
           .from("trade_entries")
           .select("*")
           .eq("user_id", user!.id)
           .gte("trade_date", thirtyDaysAgo.toISOString().split("T")[0])
           .order("trade_date", { ascending: false });
 
         setRules(rulesData);
         setEntries(entriesData || []);
       } catch (error) {
         console.error("Error fetching discipline data:", error);
       } finally {
         setLoading(false);
       }
     }
 
     fetchData();
   }, [user]);
 
   const metrics = useMemo((): DisciplineMetrics => {
     if (loading || !user) {
       return DEFAULT_METRICS;
     }
 
     if (!rules) {
       return {
         ...DEFAULT_METRICS,
         loading: false,
         canTradeReason: "Set your trading rules first",
       };
     }
 
     const today = new Date().toISOString().split("T")[0];
     
     // === TODAY'S METRICS ===
     const todayEntries = entries.filter(e => e.trade_date === today);
     const todayTradesUsed = todayEntries.length;
     const todayTradesAllowed = rules.max_trades_per_day;
     const todayLossUsed = todayEntries.reduce((sum, e) => {
       // Assume negative R:R means loss, positive means win
       // For simplicity: if followed_rules is false, count full risk as loss
       return sum + e.risk_used;
     }, 0);
     const todayLossAllowed = rules.max_daily_loss;
     const todayViolations = todayEntries.filter(e => !e.followed_rules).length;
 
     // === VIOLATION CHECKS ===
     const hasExceededMaxTrades = todayTradesUsed >= todayTradesAllowed;
     const hasExceededDailyLoss = todayLossUsed >= todayLossAllowed;
     const hasRuleViolation = todayViolations > 0;
 
     // === DISCIPLINE STREAK ===
     // Count consecutive days with 100% rule compliance
     let disciplineStreak = 0;
     const uniqueDates = [...new Set(entries.map(e => e.trade_date))].sort().reverse();
     
     for (const date of uniqueDates) {
       const dayEntries = entries.filter(e => e.trade_date === date);
       const allCompliant = dayEntries.every(e => e.followed_rules);
       if (allCompliant && dayEntries.length > 0) {
         disciplineStreak++;
       } else {
         break;
       }
     }
 
     // === COMPLIANCE RATE ===
     const totalEntries = entries.length;
     const compliantEntries = entries.filter(e => e.followed_rules).length;
     const complianceRate = totalEntries > 0 
       ? Math.round((compliantEntries / totalEntries) * 100) 
       : 100;
 
     // === AVERAGE EMOTIONAL STATE ===
     const avgEmotionalState = totalEntries > 0
       ? entries.reduce((sum, e) => sum + e.emotional_state, 0) / totalEntries
       : 3;
 
     // === DISCIPLINE SCORE (0-100) ===
     // Weighted calculation:
     // - Compliance rate: 40%
     // - Streak bonus: 20% (max at 7+ day streak)
     // - Emotional control: 20% (avg emotional state)
     // - Risk management: 20% (staying within limits)
     
     const complianceScore = complianceRate * 0.4;
     
     const streakScore = Math.min(disciplineStreak / 7, 1) * 20;
     
     const emotionalScore = ((avgEmotionalState - 1) / 4) * 20; // 1-5 scale to 0-20
     
     const riskScore = (() => {
       let score = 20;
       if (hasExceededMaxTrades) score -= 10;
       if (hasExceededDailyLoss) score -= 10;
       return Math.max(0, score);
     })();
     
     const disciplineScore = Math.round(complianceScore + streakScore + emotionalScore + riskScore);
 
     // === DISCIPLINE STATUS ===
     // LOCKED if: any violation today, exceeded limits, or score < 50
     const isLocked = hasRuleViolation || hasExceededDailyLoss || disciplineScore < 30;
     const disciplineStatus = isLocked ? "locked" : "active";
 
     // === CAN TRADE? ===
     let canTrade = true;
     let canTradeReason = "All systems clear";
 
     if (hasExceededMaxTrades) {
       canTrade = false;
       canTradeReason = `Max trades reached (${todayTradesUsed}/${todayTradesAllowed})`;
     } else if (hasExceededDailyLoss) {
       canTrade = false;
       canTradeReason = `Daily loss limit reached (${todayLossUsed.toFixed(1)}%/${todayLossAllowed}%)`;
     } else if (hasRuleViolation) {
       canTrade = false;
       canTradeReason = `Rule violation detected today`;
     } else if (disciplineStatus === "locked") {
       canTrade = false;
       canTradeReason = "Discipline score too low";
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
     };
   }, [user, rules, entries, loading]);
 
   return metrics;
 }