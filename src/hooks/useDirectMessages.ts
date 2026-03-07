import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DmThread {
  id: string;
  user_id: string;
  admin_id: string | null;
  inbox_item_id: string | null;
  created_at: string;
  last_message_at: string;
  // joined from profile
  user_display_name?: string;
  user_email?: string;
  user_avatar_url?: string;
}

export interface DmAttachmentData {
  type: "image" | "file";
  url: string;
  filename: string;
  size: number;
  mime: string;
}

export interface DmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  attachments: DmAttachmentData[];
}

/**
 * Hook for 1:1 DM system.
 * - Members see their own threads
 * - Operators/admins see all threads
 */
export function useDirectMessages() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dm_threads")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;

      // Enrich with profile data
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((t: any) => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, p])
        );

        setThreads(
          data.map((t: any) => {
            const p = profileMap.get(t.user_id);
            return {
              ...t,
              user_display_name: p?.display_name || null,
              user_email: p?.email || null,
              user_avatar_url: p?.avatar_url || null,
            };
          })
        );
      } else {
        setThreads([]);
      }
    } catch (e) {
      console.error("[useDirectMessages] fetchThreads error", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, loading, refetchThreads: fetchThreads };
}

/**
 * Hook for messages within a specific thread, with realtime subscription.
 */
export function useThreadMessages(threadId: string | null) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!threadId) { setMessages([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages((data as unknown as DmMessage[]) || []);
    } catch (e) {
      console.error("[useThreadMessages] error", e);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription — INSERT (new messages) + UPDATE (read_at changes)
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`dm-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMsg = payload.new as DmMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const updated = payload.new as DmMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  return { messages, loading, refetchMessages: fetchMessages };
}

/**
 * Find an existing thread for a member (by their user_id).
 */
export async function findThreadByUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

/**
 * Find or create a thread for a given member.
 * Lookup is by user_id ONLY — one persistent thread per member.
 */
export async function getOrCreateThread(
  memberId: string
): Promise<string | null> {
  // Check if thread exists for this member
  const { data: existing } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("user_id", memberId)
    .maybeSingle();

  if (existing?.id) return existing.id;

  // Create new thread
  const { data: newThread, error } = await supabase
    .from("dm_threads")
    .insert({ user_id: memberId })
    .select("id")
    .single();

  if (error) {
    console.error("[getOrCreateThread] error", error);
    return null;
  }
  return newThread.id;
}

/**
 * Send a message into a thread and update last_message_at.
 */
export async function sendDmMessage(
  threadId: string,
  senderId: string,
  body: string,
  attachments?: DmAttachmentData[]
): Promise<boolean> {
  const insert: any = { thread_id: threadId, sender_id: senderId, body };
  if (attachments && attachments.length > 0) {
    insert.attachments = attachments;
  }
  const { error: msgErr } = await supabase
    .from("dm_messages")
    .insert(insert);

  if (msgErr) {
    console.error("[sendDmMessage] insert error", msgErr);
    return false;
  }

  // Update thread timestamp
  await supabase
    .from("dm_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);

  return true;
}

/**
 * Mark all messages in a thread as read for a given user.
 */
export async function markThreadRead(threadId: string, userId: string) {
  await supabase
    .from("dm_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

/**
 * Get unread count for admin (messages from users that admin hasn't read).
 */
export async function getAdminUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("dm_messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .not("sender_id", "is", null);

  if (error) return 0;
  return count || 0;
}
