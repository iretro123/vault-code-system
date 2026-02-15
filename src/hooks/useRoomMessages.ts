import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  room_slug: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

const PAGE_SIZE = 40;

export function useRoomMessages(roomSlug: string) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldestRef = useRef<string | null>(null);

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

    const sorted = (data as Message[]).reverse();
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
      const sorted = (data as Message[]).reverse();
      setMessages((prev) => [...sorted, ...prev]);
      oldestRef.current = sorted[0].created_at;
      setHasMore(data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }, [roomSlug]);

  // Send message
  const sendMessage = useCallback(
    async (body: string) => {
      if (!user || !body.trim()) return;
      setSending(true);
      setError(null);

      const userName =
        (profile as any)?.display_name ||
        (profile as any)?.username ||
        user.email?.split("@")[0] ||
        "Anonymous";

      const { error: err } = await supabase.from("academy_messages").insert({
        room_slug: roomSlug,
        user_id: user.id,
        user_name: userName,
        body: body.trim(),
      });

      if (err) {
        if (err.message.includes("Rate limit")) {
          setError("Please wait 3 seconds between messages");
        } else if (err.message.includes("row-level security")) {
          setError("You don't have permission to post here");
        } else {
          setError(err.message);
        }
      } else {
        // Mark intro_posted for onboarding checklist
        supabase
          .from("profiles")
          .update({ intro_posted: true } as any)
          .eq("user_id", user.id)
          .then(() => {});
      }
      setSending(false);
    },
    [user, profile, roomSlug]
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
          const msg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
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

  return { messages, loading, hasMore, loadMore, sendMessage, sending, error };
}
