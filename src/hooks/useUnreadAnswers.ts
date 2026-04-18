import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Computes the count of coach/admin replies the user has NOT yet read.
 * A reply is "read" if a row exists in coach_answer_reads for (user_id, reply_id).
 */
export function useUnreadAnswers() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setUnreadCount(0); setLoading(false); return; }

    // Get all tickets for this user
    const { data: tickets } = await supabase
      .from("coach_tickets")
      .select("id")
      .eq("user_id", user.id);

    if (!tickets || tickets.length === 0) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const ticketIds = tickets.map((t) => t.id);

    // Get all admin/coach replies on user's tickets
    const { data: replies } = await supabase
      .from("coach_ticket_replies")
      .select("id")
      .in("ticket_id", ticketIds)
      .eq("is_admin", true);

    if (!replies || replies.length === 0) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const replyIds = replies.map((r) => r.id);

    // Get which ones the user has read
    const { data: reads } = await supabase
      .from("coach_answer_reads")
      .select("reply_id")
      .eq("user_id", user.id)
      .in("reply_id", replyIds);

    const readSet = new Set((reads || []).map((r) => r.reply_id));
    const unread = replyIds.filter((id) => !readSet.has(id)).length;
    setUnreadCount(unread);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { unreadCount, loading, refetch };
}
