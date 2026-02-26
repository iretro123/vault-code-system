import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Attachment {
  type: "image" | "file";
  url: string;
  filename: string;
  size: number;
  mime: string;
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
}

const PAGE_SIZE = 40;

// ── Global message cache per room (survives remounts) ──
const roomMessageCache = new Map<string, Message[]>();

export function useRoomMessages(roomSlug: string) {
  const { user, profile, userRole } = useAuth();
  const cached = roomMessageCache.get(roomSlug);
  const [messages, setMessages] = useState<Message[]>(cached ?? []);
  // If we have cached messages, skip loading state entirely
  const [loading, setLoading] = useState(!cached);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldestRef = useRef<string | null>(cached?.length ? cached[0].created_at : null);

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
      roomMessageCache.set(roomSlug, next);
      return next;
    });
  }, [roomSlug]);

  // Initial fetch (background refresh if cached)
  const fetchMessages = useCallback(async () => {
    if (!cached) setLoading(true);

    const { data, error: err } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", roomSlug)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const sorted = castMessages(data ?? []).reverse();
    updateMessages(sorted);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    oldestRef.current = sorted.length > 0 ? sorted[0].created_at : null;
    setLoading(false);
  }, [roomSlug, cached, updateMessages]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (!oldestRef.current) return;
    const { data } = await supabase
      .from("academy_messages")
      .select("*")
      .eq("room_slug", roomSlug)
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
  }, [roomSlug, updateMessages]);

  // Compute role string for current user
  const computeRole = useCallback(() => {
    if (userRole?.role === "operator") return "admin";
    const exp = (profile as any)?.academy_experience;
    if (exp === "veteran") return "advanced";
    if (exp === "active") return "intermediate";
    return "beginner";
  }, [userRole, profile]);

  // Send message (with optimistic insert)
  const sendMessage = useCallback(
    async (body: string, attachments?: Attachment[]) => {
      if (!user || (!body.trim() && (!attachments || attachments.length === 0))) return;
      setSending(true);
      setError(null);

      const userName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        user.email?.split("@")[0] ||
        "Anonymous";

      const roleStr = computeRole();

      // Optimistic message — appears instantly in the UI
      const optimisticId = `optimistic-${Date.now()}`;
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

      const { error: err } = await supabase.from("academy_messages").insert({
        room_slug: roomSlug,
        user_id: user.id,
        user_name: userName,
        body: optimisticMsg.body,
        user_role: roleStr,
        attachments: attachments && attachments.length > 0 ? attachments : [],
      } as any);

      if (err) {
        // Remove optimistic message on failure
        updateMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        if (err.message.includes("Rate limit")) {
          toast.error("Please wait 3 seconds between messages.");
        } else {
          toast.error("Message failed to send. Try again.");
        }
      } else {
        // The realtime subscription will replace the optimistic message with the real one.
        // We remove the optimistic entry when realtime INSERT arrives (dedup by body+timestamp is handled there).
        supabase
          .from("profiles")
          .update({ intro_posted: true } as any)
          .eq("user_id", user.id)
          .then(() => {});
      }
      setSending(false);
    },
    [user, profile, roomSlug, computeRole, updateMessages]
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

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomSlug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "academy_messages",
          filter: `room_slug=eq.${roomSlug}`,
        },
        (payload) => {
          const msg = castMessages([payload.new])[0];
          updateMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Remove any optimistic message from the same user with same body (replaced by real)
            const cleaned = prev.filter(
              (m) => !(m.id.startsWith("optimistic-") && m.user_id === msg.user_id && m.body === msg.body)
            );
            return [...cleaned, msg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "academy_messages",
          filter: `room_slug=eq.${roomSlug}`,
        },
        (payload) => {
          const updated = castMessages([payload.new])[0];
          updateMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "academy_messages",
          filter: `room_slug=eq.${roomSlug}`,
        },
        (payload) => {
          const id = (payload.old as any).id;
          updateMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomSlug, updateMessages]);

  return { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage };
}
