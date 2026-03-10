import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const ROOM_SLUGS = ["trade-floor", "announcements", "daily-setups", "wins-proof"] as const;
type RoomSlug = (typeof ROOM_SLUGS)[number];

const lsKey = (slug: string, userId: string) => `unread_ts_${slug}_${userId}`;

function getLastRead(slug: string, userId: string): string {
  try {
    return localStorage.getItem(lsKey(slug, userId)) || "1970-01-01T00:00:00Z";
  } catch {
    return "1970-01-01T00:00:00Z";
  }
}

function setLastRead(slug: string, userId: string) {
  try {
    localStorage.setItem(lsKey(slug, userId), new Date().toISOString());
  } catch {}
}

export function useUnreadCounts(activeRoomSlug: string | null, userId: string | null) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const activeRef = useRef(activeRoomSlug);
  activeRef.current = activeRoomSlug;

  // Fetch initial counts for all rooms
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function fetchCounts() {
      const results: Record<string, number> = {};
      await Promise.all(
        ROOM_SLUGS.map(async (slug) => {
          const lastRead = getLastRead(slug, userId!);
          const { count } = await supabase
            .from("academy_messages")
            .select("*", { count: "exact", head: true })
            .eq("room_slug", slug)
            .eq("is_deleted", false)
            .neq("user_id", userId!)
            .gt("created_at", lastRead);
          results[slug] = Math.min(count || 0, 99);
        })
      );
      if (!cancelled) setCounts(results);
    }

    fetchCounts();
    return () => { cancelled = true; };
  }, [userId]);

  // Mark the active room as read on mount/change
  const markRead = useCallback(
    (slug: string) => {
      if (!userId) return;
      setLastRead(slug, userId);
      setCounts((prev) => ({ ...prev, [slug]: 0 }));
    },
    [userId]
  );

  // Auto-mark active room as read
  useEffect(() => {
    if (activeRoomSlug && userId) {
      markRead(activeRoomSlug);
    }
  }, [activeRoomSlug, userId, markRead]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("unread-counts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "academy_messages",
        },
        (payload) => {
          const msg = payload.new as any;
          if (!msg || msg.user_id === userId || msg.is_deleted) return;
          const slug = msg.room_slug as string;
          if (!ROOM_SLUGS.includes(slug as RoomSlug)) return;

          // If this room is currently active, don't increment — auto-read
          if (activeRef.current === slug) {
            setLastRead(slug, userId);
            return;
          }

          setCounts((prev) => ({
            ...prev,
            [slug]: Math.min((prev[slug] || 0) + 1, 99),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);

  return { counts, totalUnread: Math.min(totalUnread, 99), markRead };
}

export function formatBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 10) return "10+";
  return String(count);
}
