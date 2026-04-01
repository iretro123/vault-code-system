import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const QUICK_EMOJIS = ["👍", "🔥", "💀"] as const;
export type ReactionEmoji = string;
export { QUICK_EMOJIS };

interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  reacted: boolean; // current user reacted
}

export function useMessageReactions(roomSlug: string, userId?: string) {
  const [reactionsMap, setReactionsMap] = useState<Map<string, ReactionRow[]>>(new Map());
  const [messageIds, setMessageIds] = useState<string[]>([]);

  // Update tracked message IDs
  const trackMessages = useCallback((ids: string[]) => {
    setMessageIds(ids);
  }, []);

  // Fetch reactions for current messages
  useEffect(() => {
    if (messageIds.length === 0) return;

    const fetchReactions = async () => {
      const { data } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", messageIds) as { data: ReactionRow[] | null };

      if (data) {
        const map = new Map<string, ReactionRow[]>();
        for (const r of data) {
          const arr = map.get(r.message_id) || [];
          arr.push(r);
          map.set(r.message_id, arr);
        }
        setReactionsMap(map);
      }
    };

    fetchReactions();
  }, [messageIds]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`reactions-${roomSlug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = payload.new as ReactionRow;
          setReactionsMap((prev) => {
            const next = new Map(prev);
            const arr = [...(next.get(row.message_id) || [])];
            if (!arr.some((r) => r.id === row.id)) {
              arr.push(row);
              next.set(row.message_id, arr);
            }
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const old = payload.old as { id: string; message_id?: string };
          setReactionsMap((prev) => {
            const next = new Map(prev);
            for (const [msgId, arr] of next.entries()) {
              const filtered = arr.filter((r) => r.id !== old.id);
              if (filtered.length !== arr.length) {
                next.set(msgId, filtered);
                break;
              }
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomSlug]);

  // Get summary for a message
  const getReactions = useCallback(
    (messageId: string): ReactionSummary[] => {
      const rows = reactionsMap.get(messageId) || [];
      // Collect all unique emojis from actual reactions
      const emojiSet = new Set<string>();
      for (const r of rows) emojiSet.add(r.emoji);
      const summaries: ReactionSummary[] = [];
      for (const emoji of emojiSet) {
        const matching = rows.filter((r) => r.emoji === emoji);
        summaries.push({
          emoji,
          count: matching.length,
          reacted: matching.some((r) => r.user_id === userId),
        });
      }
      return summaries;
    },
    [reactionsMap, userId]
  );

  // Toggle a reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: ReactionEmoji) => {
      if (!userId) return;

      const rows = reactionsMap.get(messageId) || [];
      const existing = rows.find((r) => r.user_id === userId && r.emoji === emoji);

      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        } as any);
      }
    },
    [userId, reactionsMap]
  );

  return { trackMessages, getReactions, toggleReaction };
}
