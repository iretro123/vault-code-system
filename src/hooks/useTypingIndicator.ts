import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  userId: string;
  userName: string;
}

export function useTypingIndicator(roomSlug: string, userId?: string, userName?: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    const channel = supabase.channel(`typing-${roomSlug}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const { userId: uid, userName: name } = payload as TypingUser;
      if (uid === userId) return;

      setTypingUsers((prev) => {
        const exists = prev.some((t) => t.userId === uid);
        if (!exists) return [...prev, { userId: uid, userName: name }];
        return prev;
      });

      // Auto-remove after 3.5s (slightly longer than sender timeout)
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((t) => t.userId !== uid));
      }, 3500);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomSlug, userId]);

  const broadcastTyping = useCallback(() => {
    if (!userId || !userName || !channelRef.current) return;
    const now = Date.now();
    // Throttle: broadcast at most once per second
    if (now - lastBroadcast.current < 1000) return;
    lastBroadcast.current = now;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, userName },
    });

    // Clear own typing after 3s of inactivity
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // No need to broadcast "stopped" — receivers auto-expire
    }, 3000);
  }, [userId, userName]);

  const typingText = useTypingText(typingUsers);

  return { typingText, broadcastTyping };
}

function useTypingText(typingUsers: TypingUser[]): string | null {
  if (typingUsers.length === 0) return null;
  if (typingUsers.length === 1) {
    const firstName = typingUsers[0].userName.split(/\s+/)[0];
    return `${firstName} is typing`;
  }
  return `${typingUsers.length} people are typing`;
}
