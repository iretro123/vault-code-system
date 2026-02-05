 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface MistakeAnalysis {
   mistakeType: string;
   severity: "low" | "medium" | "high" | "critical";
   description: string;
   impactScore: number;
   recommendedFix: string;
 }
 
 export interface VaultMistakeAnalysisResult {
   mistakes: MistakeAnalysis[];
   loading: boolean;
   refetch: () => void;
 }
 
 const SEVERITY_ORDER = {
   critical: 4,
   high: 3,
   medium: 2,
   low: 1,
 };
 
 export function useVaultMistakeAnalysis(): VaultMistakeAnalysisResult {
   const { user } = useAuth();
   const [mistakes, setMistakes] = useState<MistakeAnalysis[]>([]);
   const [loading, setLoading] = useState(true);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setMistakes([]);
       setLoading(false);
       return;
     }
 
     async function fetchMistakeAnalysis() {
       setLoading(true);
 
       try {
         const { data, error } = await supabase.rpc("get_vault_mistake_analysis", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching mistake analysis:", error);
           setMistakes([]);
           setLoading(false);
           return;
         }
 
         if (data && Array.isArray(data)) {
           const parsed: MistakeAnalysis[] = data.map((row) => ({
             mistakeType: row.mistake_type,
             severity: row.severity as MistakeAnalysis["severity"],
             description: row.description,
             impactScore: Number(row.impact_score),
             recommendedFix: row.recommended_fix,
           }));
 
           // Sort by severity (highest first), then by impact score
           const sorted = parsed.sort((a, b) => {
             const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
             if (severityDiff !== 0) return severityDiff;
             return b.impactScore - a.impactScore;
           });
 
           setMistakes(sorted);
         } else {
           setMistakes([]);
         }
         setLoading(false);
       } catch (error) {
         console.error("Error in fetchMistakeAnalysis:", error);
         setMistakes([]);
         setLoading(false);
       }
     }
 
     fetchMistakeAnalysis();
   }, [user, refreshKey]);
 
   // Real-time subscription for automatic refresh
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-mistake-updates")
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
 
   return { mistakes, loading, refetch };
 }