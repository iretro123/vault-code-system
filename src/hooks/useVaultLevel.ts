 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
 export interface VaultLevel {
   level: number;
   xp: number;
   xpToNextLevel: number;
   progressPercent: number;
   title: string;
   rank: string;
   nextTitle: string;
   loading: boolean;
   refetch: () => void;
 }
 
 const DEFAULT_LEVEL: Omit<VaultLevel, "refetch"> = {
   level: 1,
   xp: 0,
   xpToNextLevel: 100,
   progressPercent: 0,
   title: "Novice 1",
   rank: "Novice",
   nextTitle: "Novice 2",
   loading: true,
 };
 
 export function useVaultLevel(): VaultLevel {
   const { user } = useAuth();
   const [levelData, setLevelData] = useState<Omit<VaultLevel, "refetch">>(DEFAULT_LEVEL);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   useEffect(() => {
     if (!user) {
       setLevelData({ ...DEFAULT_LEVEL, loading: false });
       return;
     }
 
     async function fetchVaultLevel() {
       setLevelData((prev) => ({ ...prev, loading: true }));
 
       try {
         const { data, error } = await supabase.rpc("calculate_vault_level", {
           _user_id: user!.id,
         });
 
         if (error) {
           console.error("Error fetching vault level:", error);
           setLevelData({ ...DEFAULT_LEVEL, loading: false });
           return;
         }
 
         if (data && data.length > 0) {
           const result = data[0];
           setLevelData({
             level: result.vault_level,
             xp: Number(result.vault_xp),
             xpToNextLevel: Number(result.xp_to_next_level),
             progressPercent: Number(result.progress_percent),
             title: result.level_title || "Novice 1",
             rank: result.level_rank || "Novice",
             nextTitle: result.next_level_title || "Novice 2",
             loading: false,
           });
         } else {
           setLevelData({ ...DEFAULT_LEVEL, loading: false });
         }
       } catch (error) {
         console.error("Error in fetchVaultLevel:", error);
         setLevelData({ ...DEFAULT_LEVEL, loading: false });
       }
     }
 
     fetchVaultLevel();
   }, [user, refreshKey]);
 
   // Real-time subscription for automatic refresh
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-level-updates")
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
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, refetch]);
 
   return { ...levelData, refetch };
 }