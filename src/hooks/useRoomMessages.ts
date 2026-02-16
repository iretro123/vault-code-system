import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export function useRoomMessages(roomSlug: string) {
  const { user, profile, userRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldestRef = useRef<string | null>(null);

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

  // Initial fetch
  const fetchMessages = useCallback(async () => {
    setLoading(true);
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
    setMessages(sorted);
    setHasMore((data?.length ?? 0) >= PAGE_SIZE);
    oldestRef.current = sorted.length > 0 ? sorted[0].created_at : null;
    setLoading(false);
  }, [roomSlug]);

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
      setMessages((prev) => [...sorted, ...prev]);
      oldestRef.current = sorted[0].created_at;
      setHasMore(data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [roomSlug]);

  // Compute role string for current user
  const computeRole = useCallback(() => {
    if (userRole?.role === "operator") return "admin";
    const exp = (profile as any)?.academy_experience;
    if (exp === "veteran") return "advanced";
    if (exp === "active") return "intermediate";
    return "beginner";
  }, [userRole, profile]);

  // Send message
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

      const { error: err } = await supabase.from("academy_messages").insert({
        room_slug: roomSlug,
        user_id: user.id,
        user_name: userName,
        body: body.trim() || (attachments?.length ? "📎 Attachment" : ""),
        user_role: roleStr,
        attachments: attachments && attachments.length > 0 ? attachments : [],
      } as any);

      if (err) {
        if (err.message.includes("Rate limit")) {
          setError("Please wait 3 seconds between messages");
        } else if (err.message.includes("row-level security")) {
          setError("You don't have permission to post here");
        } else {
          setError(err.message);
        }
      } else {
        supabase
          .from("profiles")
          .update({ intro_posted: true } as any)
          .eq("user_id", user.id)
          .then(() => {});
      }
      setSending(false);
    },
    [user, profile, roomSlug, computeRole]
  );

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      if (!user || !newBody.trim()) return { error: "Empty message" };
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.user_id !== user.id) return { error: "Cannot edit" };

      const updatePayload: any = {
        body: newBody.trim(),
        edited_at: new Date().toISOString(),
        edit_count: (msg.edit_count || 0) + 1,
      };
      // Save original content on first edit
      if (!msg.original_content) {
        updatePayload.original_content = msg.body;
      }

      const { error: err } = await supabase
        .from("academy_messages")
        .update(updatePayload)
        .eq("id", messageId);

      if (err) return { error: err.message };

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, ...updatePayload, original_content: updatePayload.original_content ?? m.original_content }
            : m
        )
      );
      return { error: null };
    },
    [user, messages]
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

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updatePayload } : m))
      );
      return { error: null };
    },
    [user, messages, userRole]
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
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
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
          setMessages((prev) =>
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
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomSlug]);

  return { messages, loading, hasMore, loadMore, sendMessage, sending, error, editMessage, deleteMessage };
}
