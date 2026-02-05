 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export type FeedbackType = "critical" | "warning" | "positive" | "neutral";
 
 export interface VaultFeedback {
   message: string;
   type: FeedbackType;
   priority: number;
   action: string;
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 const DEFAULT_FEEDBACK: Omit<VaultFeedback, "refetch"> = {
   message: "",
   type: "neutral",
   priority: 3,
   action: "",
   loading: true,
   error: null,
 };
 
 /**
  * useVaultFeedback - Personalized feedback engine based on trading behavior.
  * Provides context-aware messages and recommended actions.
  */
 export function useVaultFeedback(): VaultFeedback {
   const { user } = useAuth();
   const [data, setData] = useState<Omit<VaultFeedback, "refetch">>(DEFAULT_FEEDBACK);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   // Fetch feedback
   useEffect(() => {
     if (!user) {
       setData({ ...DEFAULT_FEEDBACK, loading: false, message: "Sign in to receive feedback" });
       return;
     }
 
     async function fetchFeedback() {
       setData((prev) => ({ ...prev, loading: true, error: null }));
 
       try {
         const { data: result, error } = await supabase.rpc("get_vault_feedback", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching vault feedback:", error);
           setData({ ...DEFAULT_FEEDBACK, loading: false, error: "Failed to get feedback" });
           return;
         }
 
         if (result && result.length > 0) {
           const row = result[0];
           setData({
             message: row.feedback_message,
             type: row.feedback_type as FeedbackType,
             priority: row.priority,
             action: row.recommended_action,
             loading: false,
             error: null,
           });
         } else {
           setData({ ...DEFAULT_FEEDBACK, loading: false, error: "No feedback available" });
         }
       } catch (err) {
         console.error("Error in fetchFeedback:", err);
         setData({ ...DEFAULT_FEEDBACK, loading: false, error: "Feedback unavailable" });
       }
     }
 
     fetchFeedback();
   }, [user, refreshKey]);
 
   // Real-time subscription for instant updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-feedback-updates")
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
           event: "INSERT",
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