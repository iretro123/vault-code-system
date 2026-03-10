import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
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

// ── Shared global store so all hook instances stay in sync ──
let _counts: Record<string, number> = {};
let _listeners = new Set<() => void>();
let _initUserId: string | null = null;
let _channelActive = false;

function _notify() {
  _listeners.forEach((l) => l());
}

function _setCounts(updater: (prev: Record<string, number>) => Record<string, number>) {
  _counts = updater(_counts);
  _notify();
}

function _getSnapshot() {
  return _counts;
}

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

async function _fetchInitial(userId: string) {
  const results: Record<string, number> = {};
  await Promise.all(
    ROOM_SLUGS.map(async (slug) => {
      const lastRead = getLastRead(slug, userId);
      const { count } = await supabase
        .from("academy_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_slug", slug)
        .eq("is_deleted", false)
        .neq("user_id", userId)
        .gt("created_at", lastRead);
      results[slug] = Math.min(count || 0, 99);
    })
  );
  _counts = results;
  _notify();
}

async function _refreshRoom(slug: string, userId: string) {
  const lastRead = getLastRead(slug, userId);
  const { count } = await supabase
    .from("academy_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_slug", slug)
    .eq("is_deleted", false)
    .neq("user_id", userId)
    .gt("created_at", lastRead);
  _setCounts((prev) => ({ ...prev, [slug]: Math.min(count || 0, 99) }));
}

function _startRealtime(userId: string, activeRef: React.MutableRefObject<string | null>) {
  if (_channelActive) return;
  _channelActive = true;

  const channel = supabase
    .channel("unread-counts-global")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "academy_messages" },
      (payload) => {
        const msg = payload.new as any;
        if (!msg || msg.user_id === userId || msg.is_deleted) return;
        const slug = msg.room_slug as string;
        if (!ROOM_SLUGS.includes(slug as RoomSlug)) return;

        if (activeRef.current === slug) {
          setLastRead(slug, userId);
          return;
        }

        _setCounts((prev) => ({
          ...prev,
          [slug]: Math.min((prev[slug] || 0) + 1, 99),
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    _channelActive = false;
  };
}

// Shared ref for the currently active room slug across all instances
let _activeSlugRef = { current: null as string | null };

export function useUnreadCounts(activeRoomSlug: string | null, userId: string | null) {
  const counts = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  // Keep the shared active slug ref updated
  // The community page passes the real slug; sidebar passes null
  useEffect(() => {
    if (activeRoomSlug !== null) {
      _activeSlugRef.current = activeRoomSlug;
    }
    return () => {
      // Only clear if THIS instance set it (community page unmounting)
      if (activeRoomSlug !== null) {
        _activeSlugRef.current = null;
      }
    };
  }, [activeRoomSlug]);

  // Re-fetch the active room's count when entering community (handles stale data)
  useEffect(() => {
    if (activeRoomSlug && userId) {
      _refreshRoom(activeRoomSlug, userId);
    }
  }, [activeRoomSlug, userId]);

  // Init fetch + realtime — only once per userId
  useEffect(() => {
    if (!userId) return;
    if (_initUserId === userId && _channelActive) return;
    _initUserId = userId;
    _fetchInitial(userId);
    const cleanup = _startRealtime(userId, _activeSlugRef);
    return cleanup;
  }, [userId]);

  const markRead = useCallback(
    (slug: string) => {
      if (!userId) return;
      setLastRead(slug, userId);
      _setCounts((prev) => ({ ...prev, [slug]: 0 }));
    },
    [userId]
  );

  // Auto-mark active room as read
  useEffect(() => {
    if (activeRoomSlug && userId) {
      markRead(activeRoomSlug);
    }
  }, [activeRoomSlug, userId, markRead]);

  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);

  return { counts, totalUnread: Math.min(totalUnread, 99), markRead };
}

export function formatBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 10) return "10+";
  return String(count);
}
