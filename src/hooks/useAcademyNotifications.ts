import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AcademyNotification {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  link_path: string | null;
  created_at: string;
  is_read: boolean;
}

export function useAcademyNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AcademyNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch notifications (RLS filters to own + broadcasts)
    const { data: notifs } = await supabase
      .from("academy_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch reads
    const { data: reads } = await supabase
      .from("academy_notification_reads" as any)
      .select("notification_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads || []).map((r: any) => r.notification_id));

    const items: AcademyNotification[] = ((notifs as any[]) || []).map((n) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body,
      link_path: n.link_path,
      created_at: n.created_at,
      is_read: readSet.has(n.id),
    }));

    setNotifications(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    await supabase
      .from("academy_notification_reads" as any)
      .upsert({ notification_id: notificationId, user_id: user.id } as any, {
        onConflict: "notification_id,user_id",
      });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const rows = unread.map((n) => ({ notification_id: n.id, user_id: user.id }));
    await supabase
      .from("academy_notification_reads" as any)
      .upsert(rows as any, { onConflict: "notification_id,user_id" });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user, notifications]);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
