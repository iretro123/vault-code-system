 /**
  * useTradePermission - Backward-compatible wrapper around useVaultStatus
  * 
  * This hook now delegates entirely to useVaultStatus (the database authority).
  * Maintained for backward compatibility with existing components.
  * New components should use useVaultStatus directly.
  */
 import { useVaultStatus } from "./useVaultStatus";
 
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
 
 export function useTradePermission(): TradePermission {
   const vault = useVaultStatus();
 
   return {
     canTrade: vault.canTrade,
     reason: vault.reason,
     disciplineScore: vault.disciplineScore,
     disciplineStatus: vault.disciplineStatus,
     tradesRemaining: vault.tradesRemaining,
     dailyLossRemaining: vault.dailyLossRemaining,
     maxRiskPerTrade: vault.maxRiskPerTrade,
     loading: vault.loading,
     refetch: vault.refetch,
   };
 }