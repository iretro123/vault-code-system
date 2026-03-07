import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

/**
 * Track whether a specific user is online based on their last_seen_at.
 * Subscribes to realtime updates on the profiles table for that user.
 */
export function useUserPresence(userId: string | null | undefined) {
  const [online, setOnline] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  const fetchPresence = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("last_seen_at")
      .eq("user_id", userId)
      .maybeSingle();
    const ls = (data as any)?.last_seen_at || null;
    setLastSeenAt(ls);
    setOnline(isOnline(ls));
  }, [userId]);

  useEffect(() => {
    fetchPresence();
  }, [fetchPresence]);

  // Realtime subscription for presence changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`presence-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const ls = (payload.new as any)?.last_seen_at || null;
          setLastSeenAt(ls);
          setOnline(isOnline(ls));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Also re-check periodically (threshold-based)
  useEffect(() => {
    if (!lastSeenAt) return;
    const id = setInterval(() => {
      setOnline(isOnline(lastSeenAt));
    }, 30_000);
    return () => clearInterval(id);
  }, [lastSeenAt]);

  return { online, lastSeenAt };
}
