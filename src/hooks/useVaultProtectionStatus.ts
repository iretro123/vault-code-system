 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export type ProtectionLevel = "NONE" | "CAUTION" | "RESTRICTED" | "LOCKDOWN";
 
 export interface VaultProtectionStatus {
   protectionActive: boolean;
   protectionLevel: ProtectionLevel;
   protectionReason: string;
   riskRestrictionFactor: number;
   tradeCooldownMinutes: number;
   emotionalRisk: boolean;
   revengeTradingRisk: boolean;
   overtradingRisk: boolean;
   disciplineDeteriorationRisk: boolean;
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const DEFAULT_STATUS: Omit<VaultProtectionStatus, "refetch"> = {
   protectionActive: false,
   protectionLevel: "NONE",
   protectionReason: "No protection required",
   riskRestrictionFactor: 1.0,
   tradeCooldownMinutes: 0,
   emotionalRisk: false,
   revengeTradingRisk: false,
   overtradingRisk: false,
   disciplineDeteriorationRisk: false,
   loading: true,
   error: null,
 };
 
 /**
  * useVaultProtectionStatus - Detects high-risk behavioral patterns BEFORE discipline collapse.
  * Protection levels: NONE → CAUTION → RESTRICTED → LOCKDOWN
  */
 export function useVaultProtectionStatus(): VaultProtectionStatus {
   const { user } = useAuth();
   const [data, setData] = useState<Omit<VaultProtectionStatus, "refetch">>(DEFAULT_STATUS);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setData({ ...DEFAULT_STATUS, loading: false, error: "Not authenticated" });
       return;
     }
 
     async function fetchProtectionStatus() {
       setData((prev) => ({ ...prev, loading: true, error: null }));
 
       try {
         const { data: result, error } = await supabase.rpc("get_vault_protection_status", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching protection status:", error);
           setData({ ...DEFAULT_STATUS, loading: false, error: "Failed to fetch protection status" });
           return;
         }
 
         if (result && result.length > 0) {
           const row = result[0];
           setData({
             protectionActive: row.protection_active,
             protectionLevel: row.protection_level as ProtectionLevel,
             protectionReason: row.protection_reason,
             riskRestrictionFactor: Number(row.risk_restriction_factor),
             tradeCooldownMinutes: row.trade_cooldown_minutes,
             emotionalRisk: row.emotional_risk,
             revengeTradingRisk: row.revenge_trading_risk,
             overtradingRisk: row.overtrading_risk,
             disciplineDeteriorationRisk: row.discipline_deterioration_risk,
             loading: false,
             error: null,
           });
         } else {
           setData({ ...DEFAULT_STATUS, loading: false, error: "No protection data" });
         }
       } catch (err) {
         console.error("Error in fetchProtectionStatus:", err);
         setData({ ...DEFAULT_STATUS, loading: false, error: "Protection status fetch failed" });
       }
     }
 
     fetchProtectionStatus();
   }, [user, refreshKey]);
 
   // Real-time subscription for instant updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-protection-updates")
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