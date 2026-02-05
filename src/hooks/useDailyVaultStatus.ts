 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface DailyVaultStatus {
   vaultOpen: boolean;
   checklistCompleted: boolean;
   tradesToday: number;
   maxTrades: number;
   disciplineScore: number;
   vaultScore: number;
   vaultLevel: number;
   actionsRemaining: number;
   checklistId: string | null;
   loading: boolean;
   refetch: () => void;
 }
 
 const DEFAULT_STATUS: Omit<DailyVaultStatus, "refetch"> = {
   vaultOpen: false,
   checklistCompleted: false,
   tradesToday: 0,
   maxTrades: 3,
   disciplineScore: 0,
   vaultScore: 0,
   vaultLevel: 1,
   actionsRemaining: 5,
   checklistId: null,
   loading: true,
 };
 
 export function useDailyVaultStatus(): DailyVaultStatus {
   const { user } = useAuth();
   const [status, setStatus] = useState<Omit<DailyVaultStatus, "refetch">>(DEFAULT_STATUS);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setStatus({ ...DEFAULT_STATUS, loading: false });
       return;
     }
 
     async function fetchDailyStatus() {
       setStatus((prev) => ({ ...prev, loading: true }));
 
       try {
         const { data, error } = await supabase.rpc("get_daily_vault_status", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching daily vault status:", error);
           setStatus({ ...DEFAULT_STATUS, loading: false });
           return;
         }
 
         if (data && data.length > 0) {
           const result = data[0];
           setStatus({
             vaultOpen: result.vault_open,
             checklistCompleted: result.daily_checklist_completed,
             tradesToday: result.trades_taken_today,
             maxTrades: result.max_trades_allowed,
             disciplineScore: result.discipline_score,
             vaultScore: result.vault_score,
             vaultLevel: result.vault_level,
             actionsRemaining: result.required_actions_remaining,
             checklistId: result.checklist_id,
             loading: false,
           });
         } else {
           setStatus({ ...DEFAULT_STATUS, loading: false });
         }
       } catch (error) {
         console.error("Error in fetchDailyStatus:", error);
         setStatus({ ...DEFAULT_STATUS, loading: false });
       }
     }
 
     fetchDailyStatus();
   }, [user, refreshKey]);
 
   // Real-time subscription
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("daily-vault-updates")
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "vault_daily_checklist",
           filter: `user_id=eq.${user.id}`,
         },
         () => refetch()
       )
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
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...status, refetch };
 }
 
 // Hook to complete the daily checklist
 export function useCompleteDailyChecklist() {
   const { user } = useAuth();
   const [loading, setLoading] = useState(false);
 
   const completeChecklist = async (data: {
     mentalState: number;
     sleepQuality: number;
     emotionalControl: number;
     planReviewed: boolean;
     riskConfirmed: boolean;
   }): Promise<{ success: boolean; message: string }> => {
     if (!user) {
       return { success: false, message: "Not authenticated" };
     }
 
     setLoading(true);
 
     try {
       const { data: result, error } = await supabase.rpc("complete_daily_checklist", {
         _user_id: user.id,
         _mental_state: data.mentalState,
         _sleep_quality: data.sleepQuality,
         _emotional_control: data.emotionalControl,
         _plan_reviewed: data.planReviewed,
         _risk_confirmed: data.riskConfirmed,
       });
 
       if (error) {
         console.error("Error completing checklist:", error);
         return { success: false, message: error.message };
       }
 
       if (result && result.length > 0) {
         return { success: result[0].success, message: result[0].message };
       }
 
       return { success: false, message: "Unknown error" };
     } catch (error) {
       console.error("Error in completeChecklist:", error);
       return { success: false, message: "Failed to complete checklist" };
     } finally {
       setLoading(false);
     }
   };
 
   return { completeChecklist, loading };
 }