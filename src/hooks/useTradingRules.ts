 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 import { useToast } from "./use-toast";
 
 export interface TradingRules {
   id: string;
   max_risk_per_trade: number;
   max_trades_per_day: number;
   max_daily_loss: number;
   allowed_sessions: string[];
   forbidden_behaviors: string[];
 }
 
 export function useTradingRules() {
   const { user } = useAuth();
   const { toast } = useToast();
   const [rules, setRules] = useState<TradingRules | null>(null);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (user) {
       fetchRules();
     } else {
       setRules(null);
       setLoading(false);
     }
   }, [user]);
 
   async function fetchRules() {
     try {
       const { data, error } = await supabase
         .from("trading_rules")
         .select("*")
         .eq("user_id", user!.id)
         .maybeSingle();
 
       if (error) throw error;
       setRules(data);
     } catch (error) {
       console.error("Error fetching rules:", error);
     } finally {
       setLoading(false);
     }
   }
 
   async function updateRules(updates: Partial<Omit<TradingRules, "id">>) {
     if (!user) return { error: new Error("Not authenticated") };
 
     try {
       const { error } = await supabase
         .from("trading_rules")
         .update(updates)
         .eq("user_id", user.id);
 
       if (error) throw error;
 
       setRules((prev) => (prev ? { ...prev, ...updates } : null));
       toast({
         title: "Rules saved",
         description: "Your trading rules have been updated.",
       });
       return { error: null };
     } catch (error) {
       console.error("Error updating rules:", error);
       toast({
         title: "Error saving rules",
         description: "Please try again.",
         variant: "destructive",
       });
       return { error };
     }
   }
 
   return { rules, loading, updateRules, refetch: fetchRules };
 }