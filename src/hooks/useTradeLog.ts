 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 import { useToast } from "./use-toast";
 
 export interface TradeEntry {
   id: string;
   user_id: string;
   trade_date: string;
   risk_used: number;
   risk_reward: number;
   followed_rules: boolean;
   emotional_state: number;
   notes: string | null;
   created_at: string;
 }
 
 export interface NewTradeEntry {
   risk_used: number;
   risk_reward: number;
   followed_rules: boolean;
   emotional_state: number;
   notes?: string;
 }
 
 export function useTradeLog() {
   const { user } = useAuth();
   const { toast } = useToast();
   const [entries, setEntries] = useState<TradeEntry[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (user) {
       fetchEntries();
     } else {
       setEntries([]);
       setLoading(false);
     }
   }, [user]);
 
   async function fetchEntries() {
     try {
       const { data, error } = await supabase
         .from("trade_entries")
         .select("*")
         .eq("user_id", user!.id)
         .order("created_at", { ascending: false })
         .limit(50);
 
       if (error) throw error;
       setEntries(data || []);
     } catch (error) {
       console.error("Error fetching trade entries:", error);
     } finally {
       setLoading(false);
     }
   }
 
   async function addEntry(entry: NewTradeEntry) {
     if (!user) return { error: new Error("Not authenticated") };
 
     try {
       const { data, error } = await supabase
         .from("trade_entries")
         .insert({
           user_id: user.id,
           ...entry,
         })
         .select()
         .single();
 
       if (error) throw error;
 
       setEntries((prev) => [data, ...prev]);
       toast({
         title: "Trade logged",
         description: "Your trade has been recorded.",
       });
       return { error: null, data };
     } catch (error) {
       console.error("Error adding trade entry:", error);
       toast({
         title: "Error logging trade",
         description: "Please try again.",
         variant: "destructive",
       });
       return { error };
     }
   }
 
   async function deleteEntry(id: string) {
     if (!user) return { error: new Error("Not authenticated") };
 
     try {
       const { error } = await supabase
         .from("trade_entries")
         .delete()
         .eq("id", id)
         .eq("user_id", user.id);
 
       if (error) throw error;
 
       setEntries((prev) => prev.filter((e) => e.id !== id));
       toast({
         title: "Trade deleted",
         description: "Entry has been removed.",
       });
       return { error: null };
     } catch (error) {
       console.error("Error deleting trade entry:", error);
       return { error };
     }
   }
 
   // Stats for the current week
   const weekStats = {
     tradesCount: entries.filter((e) => {
       const entryDate = new Date(e.trade_date);
       const now = new Date();
       const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
       return entryDate >= weekAgo;
     }).length,
     violations: entries.filter((e) => {
       const entryDate = new Date(e.trade_date);
       const now = new Date();
       const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
       return entryDate >= weekAgo && !e.followed_rules;
     }).length,
   };
 
   return { entries, loading, addEntry, deleteEntry, refetch: fetchEntries, weekStats };
 }