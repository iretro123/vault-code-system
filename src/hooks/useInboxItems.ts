import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface InboxItem {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
  pinned: boolean;
  dm_thread_id: string | null;
}

export function useInboxItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("inbox_items" as any)
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    setItems((data as any[] || []).map((d: any) => ({
      id: d.id,
      user_id: d.user_id,
      type: d.type,
      title: d.title,
      body: d.body,
      link: d.link,
      created_at: d.created_at,
      read_at: d.read_at,
      pinned: d.pinned ?? false,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const unreadCount = items.filter((i) => !i.read_at).length;

  const markRead = useCallback(async (itemId: string) => {
    if (!user) return;
    await supabase
      .from("inbox_items" as any)
      .update({ read_at: new Date().toISOString() } as any)
      .eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, read_at: new Date().toISOString() } : i))
    );
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = items.filter((i) => !i.read_at);
    if (unread.length === 0) return;

    const userItems = unread.filter((i) => i.user_id === user.id);
    if (userItems.length > 0) {
      await supabase
        .from("inbox_items" as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq("user_id", user.id)
        .is("read_at", null);
    }

    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })));
  }, [user, items]);

  return { items, loading, unreadCount, refetch, markRead, markAllRead };
}
