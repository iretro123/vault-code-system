 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 interface RecoveryTask {
   id: string;
   title: string;
   description: string;
   completed: boolean;
   order: number;
 }
 
 export interface VaultRecoveryPlan {
   isLocked: boolean;
   lockReason: string;
   tasksRequired: number;
   tasksCompleted: number;
   progressPercent: number;
   nextAction: string;
   estimatedUnlockTime: string;
   tasks: RecoveryTask[];
   loading: boolean;
   refetch: () => void;
 }
 
 const DEFAULT_PLAN: Omit<VaultRecoveryPlan, "refetch"> = {
   isLocked: false,
   lockReason: "",
   tasksRequired: 0,
   tasksCompleted: 0,
   progressPercent: 100,
   nextAction: "",
   estimatedUnlockTime: "",
   tasks: [],
   loading: true,
 };
 
 export function useVaultRecoveryPlan(): VaultRecoveryPlan {
   const { user } = useAuth();
   const [plan, setPlan] = useState<Omit<VaultRecoveryPlan, "refetch">>(DEFAULT_PLAN);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setPlan({ ...DEFAULT_PLAN, loading: false });
       return;
     }
 
     async function fetchRecoveryPlan() {
       setPlan((prev) => ({ ...prev, loading: true }));
 
       try {
         const { data, error } = await supabase.rpc("get_vault_recovery_plan", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching recovery plan:", error);
           setPlan({ ...DEFAULT_PLAN, loading: false });
           return;
         }
 
         if (data && data.length > 0) {
           const result = data[0];
           const tasks = (result.tasks as unknown as RecoveryTask[]) || [];
           
           setPlan({
             isLocked: result.is_locked,
             lockReason: result.lock_reason || "",
             tasksRequired: result.recovery_tasks_required,
             tasksCompleted: result.recovery_tasks_completed,
             progressPercent: Number(result.recovery_progress_percent),
             nextAction: result.next_required_action || "",
             estimatedUnlockTime: result.estimated_unlock_time || "",
             tasks: tasks.sort((a, b) => a.order - b.order),
             loading: false,
           });
         } else {
           setPlan({ ...DEFAULT_PLAN, loading: false });
         }
       } catch (error) {
         console.error("Error in fetchRecoveryPlan:", error);
         setPlan({ ...DEFAULT_PLAN, loading: false });
       }
     }
 
     fetchRecoveryPlan();
   }, [user, refreshKey]);
 
   // Real-time subscription for automatic refresh
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-recovery-updates")
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
       .on(
         "postgres_changes",
         {
           event: "*",
           schema: "public",
           table: "pre_trade_checks",
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
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...plan, refetch };
 }