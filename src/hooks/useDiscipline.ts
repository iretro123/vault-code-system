 /**
  * useDiscipline - Backward-compatible wrapper around useVaultStatus
  * 
  * This hook now delegates entirely to useVaultStatus (the database authority).
  * Maintained for backward compatibility with existing components.
  * New components should use useVaultStatus directly.
  */
 import { useVaultStatus } from "./useVaultStatus";
 
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
   const vault = useVaultStatus();
 
   // All data now comes from the unified vault status
   // Computed flags derived from database authority
   const hasExceededMaxTrades = vault.tradesRemaining <= 0;
   const hasExceededDailyLoss = vault.dailyLossRemaining <= 0;
   const hasRuleViolation = !vault.canTrade && vault.reason.includes("violation");
 
   return {
     disciplineStatus: vault.disciplineStatus,
     disciplineScore: vault.disciplineScore,
     canTrade: vault.canTrade,
     canTradeReason: vault.reason,
     todayTradesUsed: vault.tradesToday,
     todayTradesAllowed: vault.maxTradesPerDay,
     todayLossUsed: vault.dailyLossUsed,
     todayLossAllowed: vault.maxDailyLoss,
     disciplineStreak: vault.streakDays,
     // These are UI-only values, default to reasonable values
     complianceRate: 100,
     avgEmotionalState: 3,
     hasExceededMaxTrades,
     hasExceededDailyLoss,
     hasRuleViolation,
     todayViolations: hasRuleViolation ? 1 : 0,
     loading: vault.loading,
     refetch: vault.refetch,
   };
 }