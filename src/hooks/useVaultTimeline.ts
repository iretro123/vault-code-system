 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";
 
 export interface VaultEvent {
   event_id: string;
   event_type: string;
  event_context: Json | null;
   created_at: string;
 }
 
 interface UseVaultTimelineReturn {
   events: VaultEvent[];
   loading: boolean;
   error: string | null;
   refetch: () => void;
 }
 
 /**
  * useVaultTimeline - Fetches and subscribes to vault events in real-time.
  * Provides the complete behavior history for the Vault Intelligence Engine.
  */
 export function useVaultTimeline(limit: number = 50): UseVaultTimelineReturn {
   const { user } = useAuth();
   const [events, setEvents] = useState<VaultEvent[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [refreshKey, setRefreshKey] = useState(0);
 
   const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);
 
   // Fetch timeline events
   useEffect(() => {
     if (!user) {
       setEvents([]);
       setLoading(false);
       return;
     }
 
     async function fetchTimeline() {
       setLoading(true);
       setError(null);
 
       try {
         const { data, error: rpcError } = await supabase.rpc("get_vault_timeline", {
           _user_id: user!.id,
           _limit: limit,
         });
 
         if (rpcError) {
           console.error("Error fetching vault timeline:", rpcError);
           setError("Failed to fetch timeline");
           setEvents([]);
           return;
         }
 
         setEvents(data || []);
       } catch (err) {
         console.error("Error in fetchTimeline:", err);
         setError("Timeline fetch failed");
         setEvents([]);
       } finally {
         setLoading(false);
       }
     }
 
     fetchTimeline();
   }, [user, limit, refreshKey]);
 
   // Real-time subscription for instant updates
   useEffect(() => {
     if (!user) return;
 
     const channel = supabase
       .channel("vault-timeline-updates")
       .on(
         "postgres_changes",
         {
           event: "INSERT",
           schema: "public",
           table: "vault_events",
           filter: `user_id=eq.${user.id}`,
         },
         (payload) => {
           // Prepend new event to the list
           const newEvent: VaultEvent = {
             event_id: payload.new.id,
             event_type: payload.new.event_type,
             event_context: payload.new.event_context,
             created_at: payload.new.created_at,
           };
           setEvents((prev) => [newEvent, ...prev.slice(0, limit - 1)]);
         }
       )
       .subscribe((status, err) => {
         if (status === "SUBSCRIBED") {
           console.log("Realtime: Subscribed to vault timeline");
         } else if (status === "CHANNEL_ERROR") {
           console.error("Realtime channel error:", err);
         }
       });
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [user, limit]);
 
   return { events, loading, error, refetch };
 }