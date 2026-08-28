import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Attachment {
  type: "image" | "file" | "signal-watchlist" | "signal-live";
  url?: string;
  filename?: string;
  size?: number;
  mime?: string;
  [key: string]: any;
}

interface Message {
  id: string;
  room_slug: string;
  user_id: string;
  user_name: string;
  user_role: string;
  body: string;
  attachments: Attachment[];
  created_at: string;
  edited_at: string | null;
  edit_count: number;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  original_content: string | null;
  parent_message_id?: string | null;
  reply_count?: number;
}

const PAGE_SIZE = 40;
const DEFERRED_ROOM_SLUG = "__deferred__";

// ── Global message cache per room (survives remounts) ──
const roomMessageCache = new Map<string, Message[]>();

export function useRoomMessages(roomSlug: string, _activationKey?: number) {
  const canUseRoom = Boolean(roomSlug) && roomSlug !== DEFERRED_ROOM_SLUG;
  const { user, profile, userRole } = useAuth();
  const cachedRef = useRef(canUseRoom ? roomMessageCache.get(roomSlug) : undefined);
  const cached = cachedRef.current;
  const [messages, setMessages] = useState<Message[]>(cached ?? []);
  // If we have cached messages, skip loading state entirely
  const [loading, setLoading] = useState(canUseRoom && !cached);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldestRef = useRef<string | null>(cached?.length ? cached[0].created_at : null);
  const hasFetchedRef = useRef(false);

  const castMessages = (data: any[]): Message[] =>
    data.map((d) => ({
      ...d,
      attachments: d.attachments ?? [],
      edited_at: d.edited_at ?? null,
      edit_count: d.edit_count ?? 0,
      is_deleted: d.is_deleted ?? false,
      deleted_at: d.deleted_at ?? null,
      deleted_by: d.deleted_by ?? null,
      original_content: d.original_content ?? null,
    }));

  // Persist to cache whenever messages change
  const updateMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (canUseRoom) roomMessageCache.set(roomSlug, next);
      return next;
    });
  }, [canUseRoom, roomSlug]);

  // Initial fetch (background refresh if cached)
  const fetchMessages = useCallback(async () => {
    if (!canUseRoom) {
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      setError(null);
      return;
    }

    if (!cachedRef.current) setLoading(true);

    const { data, error: err } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", roomSlug)
      .is("parent_message_id", null)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (err) {
      setError(err.message);
      // Clear stale cache on error so next activation does a clean fetch
      roomMessageCache.delete(roomSlug);
      setLoading(false);
      return;
    }

    const sorted = castMessages(data ?? []).reverse();
    // Diff by IDs — skip update if identical to prevent unnecessary re-render
    setMessages((prev) => {
      const same = prev.length === sorted.length && prev.every((m, i) => m.id === sorted[i].id && m.edit_count === sorted[i].edit_count && m.is_deleted === sorted[i].is_deleted);
      if (same) return prev;
      roomMessageCache.set(roomSlug, sorted);
      return sorted;
    });
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    oldestRef.current = sorted.length > 0 ? sorted[0].created_at : null;
    setLoading(false);
  }, [canUseRoom, roomSlug, updateMessages]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!canUseRoom || !oldestRef.current) return;
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", roomSlug)
      .is("parent_message_id", null)
      .eq("is_deleted", false)
      .lt("created_at", oldestRef.current)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data && data.length > 0) {
      const sorted = castMessages(data).reverse();
      updateMessages((prev) => [...sorted, ...prev]);
      oldestRef.current = sorted[0].created_at;
      setHasMore(data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [canUseRoom, roomSlug, updateMessages]);

  // Compute role string for current user
  const computeRole = useCallback(() => {
    if (userRole?.role === "operator") return "admin";
    const exp = (profile as any)?.academy_experience;
    // Support both legacy (veteran/active) and new (advanced/intermediate/beginner) values
    if (exp === "veteran" || exp === "advanced") return "advanced";
    if (exp === "active" || exp === "intermediate") return "intermediate";
    return "beginner";
  }, [userRole, profile]);

  // Send message (with optimistic insert)
  const sendMessage = useCallback(
    async (body: string, attachments?: Attachment[]) => {
      if (!canUseRoom) {
        return { ok: false, status: 409, error: "room not ready" };
      }
      if (!user || (!body.trim() && (!attachments || attachments.length === 0))) {
        return { ok: false, status: 400, error: "invalid payload" };
      }

      setSending(true);
      setError(null);

      const userName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        user.email?.split("@")[0] ||
        "Anonymous";

      const roleStr = computeRole();

      // Use the final database-compatible ID for the optimistic row. This keeps
      // reactions and every other UUID-backed query safe while the insert is pending.
      const optimisticId = crypto.randomUUID();
      const optimisticMsg: Message = {
        id: optimisticId,
        room_slug: roomSlug,
        user_id: user.id,
        user_name: userName,
        user_role: roleStr,
        body: body.trim() || (attachments?.length ? "📎 Attachment" : ""),
        attachments: attachments ?? [],
        created_at: new Date().toISOString(),
        edited_at: null,
        edit_count: 0,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        original_content: null,
      };
      updateMessages((prev) => [...prev, optimisticMsg]);

      const { data: insertedMessage, error: err } = await supabase
        .from("academy_messages")
        .insert({
          id: optimisticId,
          room_slug: roomSlug,
          user_id: user.id,
          user_name: userName,
          body: optimisticMsg.body,
          user_role: roleStr,
          attachments: attachments && attachments.length > 0 ? attachments : [],
        } as any)
        .select("id, created_at, attachments")
        .maybeSingle();

      if (err) {
        // Remove optimistic message on failure
        updateMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error("[useRoomMessages] Message insert failed", {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint,
          roomSlug,
        });
        const errorMessage = err.code === "42501"
          ? "Your session could not post this message. Sign out, sign back in, and try again."
          : "Message failed to send. Your text was kept so you can try again.";
        toast.error(errorMessage);

        setSending(false);
        return {
          ok: false,
          status: err.code === "42501" ? 403 : 400,
          error: err.message,
          body: {
            code: err.code,
            details: err.details,
            hint: err.hint,
          },
        };
      }

      updateMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticId
            ? {
                ...message,
                created_at: insertedMessage?.created_at ?? message.created_at,
                attachments: insertedMessage?.attachments ?? message.attachments,
              }
            : message
        )
      );

      // The realtime subscription will replace the optimistic message with the real one.
      // We remove the optimistic entry when realtime INSERT arrives (dedup by body+timestamp is handled there).
      supabase
        .from("profiles")
        .update({ intro_posted: true } as any)
        .eq("user_id", user.id)
        .then(() => {});

      // Mark intro_posted on onboarding_state
      supabase
        .from("onboarding_state")
        .update({ intro_posted: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .then(() => {});

      setSending(false);
      return {
        ok: true,
        status: 201,
        body: insertedMessage,
      };
    },
    [canUseRoom, user, profile, roomSlug, computeRole, updateMessages]
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      if (!user || !newBody.trim()) return { error: "Empty message" };
      const isOp = userRole?.role === "operator";
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return { error: "Message not found" };
      if (!isOp && msg.user_id !== user.id) return { error: "Cannot edit" };
      const ageMs = Date.now() - new Date(msg.created_at).getTime();
      if (!isOp && ageMs >= 15 * 60 * 1000) return { error: "Edit window expired (15 min)" };

      const updatePayload: any = {
        body: newBody.trim(),
        edited_at: new Date().toISOString(),
        edit_count: (msg.edit_count || 0) + 1,
      };
      if (!msg.original_content) {
        updatePayload.original_content = msg.body;
      }

      const { error: err } = await supabase
        .from("academy_messages")
        .update(updatePayload)
        .eq("id", messageId);

      if (err) return { error: err.message };

      updateMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, ...updatePayload, original_content: updatePayload.original_content ?? m.original_content }
            : m
        )
      );
      return { error: null };
    },
    [user, messages, userRole, updateMessages]
  );

  // Soft-delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return { error: "Not authenticated" };
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return { error: "Message not found" };

      const isOwner = msg.user_id === user.id;
      const isOp = userRole?.role === "operator";
      if (!isOwner && !isOp) return { error: "No permission" };

      const updatePayload: any = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      };

      const { error: err } = await supabase
        .from("academy_messages")
        .update(updatePayload)
        .eq("id", messageId);

      if (err) return { error: err.message };

      updateMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updatePayload } : m))
      );
      return { error: null };
    },
    [user, messages, userRole, updateMessages]
  );

  // Initial load — run once per roomSlug
  useEffect(() => {
    hasFetchedRef.current = false;
    cachedRef.current = canUseRoom ? roomMessageCache.get(roomSlug) : undefined;
    oldestRef.current = cachedRef.current?.length ? cachedRef.current[0].created_at : null;
  }, [roomSlug]);

  useEffect(() => {
    if (!canUseRoom) {
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      setError(null);
      return;
    }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchMessages();
  }, [canUseRoom, fetchMessages]);

  // Re-fetch when activation key changes (tab re-activated)
  useEffect(() => {
    if (canUseRoom && _activationKey && _activationKey > 0 && hasFetchedRef.current) {
      fetchMessages();
    }
  }, [canUseRoom, _activationKey, fetchMessages]);

  // ── Live sync engine ──────────────────────────────────────────────
  // Realtime stream + self-healing resubscribe + lightweight catch-up poll
  // so a new message always lands within ~1s without a manual refresh.
  const latestRef = useRef<string | null>(null);
  useEffect(() => {
    latestRef.current = messages.length ? messages[messages.length - 1].created_at : null;
  }, [messages]);

  const applyIncoming = useCallback((rows: any[]) => {
    if (!rows.length) return;
    const incoming = castMessages(rows);
    updateMessages((prev) => {
      let next = prev;
      for (const msg of incoming) {
        if (next.some((m) => m.id === msg.id)) continue;
        next = next.filter(
          (m) => !(m.id.startsWith("optimistic-") && m.user_id === msg.user_id && m.body === msg.body)
        );
        next = [...next, msg];
      }
      if (next === prev) return prev;
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return next;
    });
  }, [updateMessages]);

  // Catch-up: pull anything newer than what we already have (cheap, indexed)
  const catchUp = useCallback(async () => {
    if (!canUseRoom) return;
    if (!latestRef.current) {
      if (hasFetchedRef.current) await fetchMessages();
      return;
    }
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", roomSlug)
      .is("parent_message_id", null)
      .eq("is_deleted", false)
      .gt("created_at", latestRef.current)
      .order("created_at", { ascending: true })
      .limit(PAGE_SIZE);
    if (data?.length) applyIncoming(data);
  }, [canUseRoom, roomSlug, applyIncoming, fetchMessages]);

  useEffect(() => {
    if (!canUseRoom) return;

    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retry = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let live = false;

    const subscribe = () => {
      if (disposed) return;
      channel = supabase
        .channel(`room-${roomSlug}-${Math.random().toString(36).slice(2, 8)}`, {
          config: { broadcast: { ack: false } },
        })
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "academy_messages", filter: `room_slug=eq.${roomSlug}` },
          (payload) => applyIncoming([payload.new])
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "academy_messages", filter: `room_slug=eq.${roomSlug}` },
          (payload) => {
            const updated = castMessages([payload.new])[0];
            updateMessages((prev) =>
              updated.is_deleted
                ? prev.filter((m) => m.id !== updated.id)
                : prev.map((m) => (m.id === updated.id ? updated : m))
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "academy_messages", filter: `room_slug=eq.${roomSlug}` },
          (payload) => {
            const id = (payload.old as any).id;
            updateMessages((prev) => prev.filter((m) => m.id !== id));
          }
        )
        .subscribe((status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            live = true;
            retry = 0;
            // Fill any gap created while the socket was down
            catchUp();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            live = false;
            if (retryTimer) clearTimeout(retryTimer);
            const delay = Math.min(1000 * 2 ** retry, 15000);
            retry += 1;
            retryTimer = setTimeout(async () => {
              if (disposed) return;
              if (channel) supabase.removeChannel(channel);
              const { data } = await supabase.auth.getSession();
              if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
              subscribe();
            }, delay);
          }
        });
    };

    subscribe();

    // Safety net: cheap catch-up poll. Every 2s while the socket is down,
    // every 6s when realtime is healthy — new messages never get stranded.
    let tick = 0;
    const poll = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick += 1;
      if (live && tick % 3 !== 0) return;
      catchUp();
    }, 2000);

    const onWake = () => {
      if (document.visibilityState === "visible") catchUp();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    window.addEventListener("focus", onWake);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
      window.removeEventListener("focus", onWake);
      if (channel) supabase.removeChannel(channel);
    };
  }, [canUseRoom, roomSlug, updateMessages, applyIncoming, catchUp]);

  return { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage };
}
