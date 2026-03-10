import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const ROOM_SLUGS = ["trade-floor", "announcements", "daily-setups", "wins-proof"] as const;
type RoomSlug = (typeof ROOM_SLUGS)[number];

// ── Shared global store (singleton across all hook instances) ──
let _counts: Record<string, number> = {};
let _listeners = new Set<() => void>();
let _initUserId: string | null = null;
let _channelActive = false;
let _soundsEnabled = true;

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

// ── Shared active room ref ──
let _activeSlugRef = { current: null as string | null };
let _isAtBottomRef = { current: true };

// ── Notification sound (generated programmatically — no external file needed) ──
let _audioCtx: AudioContext | null = null;
let _userHasInteracted = false;

function _ensureInteractionTracking() {
  if (_userHasInteracted) return;
  const handler = () => {
    _userHasInteracted = true;
    document.removeEventListener("click", handler);
    document.removeEventListener("keydown", handler);
  };
  document.addEventListener("click", handler, { once: true });
  document.addEventListener("keydown", handler, { once: true });
}

function _playNotifySound() {
  if (!_soundsEnabled || !_userHasInteracted) return;
  try {
    if (!_audioCtx) _audioCtx = new AudioContext();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Two-tone chime: clean, premium feel
    [880, 1108.73].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  } catch {}
}

// ── DB queries ──

/** Fetch unread counts for all rooms */
async function _fetchAllCounts(userId: string) {
  const results: Record<string, number> = {};

  // Get user's read positions
  const { data: reads } = await supabase
    .from("academy_room_reads")
    .select("room_slug, last_read_seq")
    .eq("user_id", userId);

  const readMap: Record<string, number> = {};
  (reads || []).forEach((r: any) => { readMap[r.room_slug] = r.last_read_seq; });

  await Promise.all(
    ROOM_SLUGS.map(async (slug) => {
      const lastSeq = readMap[slug] || 0;
      const { count } = await supabase
        .from("academy_messages")
        .select("*", { count: "exact", head: true })
        .eq("room_slug", slug)
        .eq("is_deleted", false)
        .neq("user_id", userId)
        .gt("seq", lastSeq);
      results[slug] = Math.min(count || 0, 99);
    })
  );

  _counts = results;
  _notify();
}

/** Refresh a single room count */
async function _refreshRoom(slug: string, userId: string) {
  const { data: reads } = await supabase
    .from("academy_room_reads")
    .select("last_read_seq")
    .eq("user_id", userId)
    .eq("room_slug", slug)
    .maybeSingle();

  const lastSeq = (reads as any)?.last_read_seq || 0;
  const { count } = await supabase
    .from("academy_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_slug", slug)
    .eq("is_deleted", false)
    .neq("user_id", userId)
    .gt("seq", lastSeq);

  _setCounts((prev) => ({ ...prev, [slug]: Math.min(count || 0, 99) }));
}

/** Mark a room as read to the latest seq in that room */
async function _markReadDB(slug: string, userId: string) {
  // Get latest seq in this room
  const { data: latest } = await supabase
    .from("academy_messages")
    .select("seq")
    .eq("room_slug", slug)
    .eq("is_deleted", false)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestSeq = (latest as any)?.seq || 0;
  if (latestSeq === 0) return;

  // Upsert the read position
  const { error } = await supabase
    .from("academy_room_reads")
    .upsert(
      { user_id: userId, room_slug: slug, last_read_seq: latestSeq, updated_at: new Date().toISOString() },
      { onConflict: "user_id,room_slug" }
    );

  if (!error) {
    _setCounts((prev) => ({ ...prev, [slug]: 0 }));
  }
}

/** Load sounds_enabled preference */
async function _loadSoundsPreference(userId: string) {
  const { data } = await supabase
    .from("user_preferences")
    .select("sounds_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  _soundsEnabled = (data as any)?.sounds_enabled ?? true;
}

// ── Realtime subscriptions ──

function _startRealtime(userId: string) {
  if (_channelActive) return;
  _channelActive = true;
  _ensureInteractionTracking();

  // Channel 1: new messages
  const msgChannel = supabase
    .channel("unread-msg-global")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "academy_messages" },
      (payload) => {
        const msg = payload.new as any;
        if (!msg || msg.user_id === userId || msg.is_deleted) return;
        const slug = msg.room_slug as string;
        if (!ROOM_SLUGS.includes(slug as RoomSlug)) return;

        // If user is viewing this room and at the bottom, auto-mark read
        if (_activeSlugRef.current === slug && _isAtBottomRef.current) {
          // Silently mark read in DB (don't increment count)
          _markReadDB(slug, userId);
          return;
        }

        // Increment count
        _setCounts((prev) => ({
          ...prev,
          [slug]: Math.min((prev[slug] || 0) + 1, 99),
        }));

        // Play sound if room is not active
        if (_activeSlugRef.current !== slug) {
          _playNotifySound();
        }
      }
    )
    .subscribe();

  // Channel 2: room_reads changes (cross-tab/device sync)
  const readsChannel = supabase
    .channel("unread-reads-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "academy_room_reads", filter: `user_id=eq.${userId}` },
      (payload) => {
        // Another tab/device updated read position — re-fetch that room
        const row = (payload.new || payload.old) as any;
        if (row?.room_slug) {
          _refreshRoom(row.room_slug, userId);
        }
      }
    )
    .subscribe();

  // Channel 3: preference changes (sounds toggle)
  const prefsChannel = supabase
    .channel("unread-prefs-sync")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "user_preferences", filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as any;
        if (row && typeof row.sounds_enabled === "boolean") {
          _soundsEnabled = row.sounds_enabled;
        }
      }
    )
    .subscribe();

  // Reconciliation on visibility change + focus
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      _fetchAllCounts(userId);
    }
  };
  const handleFocus = () => {
    _fetchAllCounts(userId);
  };
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", handleFocus);

  return () => {
    supabase.removeChannel(msgChannel);
    supabase.removeChannel(readsChannel);
    supabase.removeChannel(prefsChannel);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", handleFocus);
    _channelActive = false;
  };
}

// ── Hook ──

export function useUnreadCounts(activeRoomSlug: string | null, userId: string | null) {
  const counts = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  // Keep the shared active slug ref updated
  // The community page passes the real slug; sidebar passes null
  useEffect(() => {
    if (activeRoomSlug !== null) {
      _activeSlugRef.current = activeRoomSlug;
    }
    return () => {
      if (activeRoomSlug !== null) {
        _activeSlugRef.current = null;
      }
    };
  }, [activeRoomSlug]);

  // Re-fetch the active room's count when entering community
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
    _fetchAllCounts(userId);
    _loadSoundsPreference(userId);
    const cleanup = _startRealtime(userId);
    return cleanup;
  }, [userId]);

  const markRead = useCallback(
    (slug: string) => {
      if (!userId) return;
      // Optimistic: set count to 0 immediately
      _setCounts((prev) => ({ ...prev, [slug]: 0 }));
      // Persist to DB
      _markReadDB(slug, userId);
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

/** Expose isAtBottom setter for chat scroll containers */
export function setUnreadIsAtBottom(atBottom: boolean) {
  _isAtBottomRef.current = atBottom;
}

export function formatBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 10) return "10+";
  return String(count);
}
