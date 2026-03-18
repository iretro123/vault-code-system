import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyData } from "@/contexts/AcademyDataContext";
import { useOSNotifications } from "@/hooks/useOSNotifications";
import { hapticStrong } from "@/lib/nativeFeedback";

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
  const { refetchNotifications } = useAcademyData();
  const { notify } = useOSNotifications();
  const [notifications, setNotifications] = useState<AcademyNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [newArrival, setNewArrival] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: notifs } = await supabase
      .from("academy_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

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

  // Realtime: listen for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("academy-notifs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "academy_notifications",
        },
        (payload) => {
          const n = payload.new as any;
          // Only process if it's for this user or a broadcast (null)
          if (n.user_id !== null && n.user_id !== user.id) return;

          const newNotif: AcademyNotification = {
            id: n.id,
            user_id: n.user_id,
            type: n.type,
            title: n.title,
            body: n.body,
            link_path: n.link_path,
            created_at: n.created_at,
            is_read: false,
          };

          setNotifications((prev) => [newNotif, ...prev]);
          setNewArrival(true);
          refetchNotifications();

          // OS/browser notification only for mentions, CEO/RZ alerts, or live-now
          if (n.type === "mention" || n.type === "rz_message" || n.type === "live_now") {
            notify({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body || "",
              linkPath: n.link_path,
            });
            if (n.type === "live_now") {
              void hapticStrong();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchNotifications]);

  const clearNewArrival = useCallback(() => setNewArrival(false), []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useCallback(async (notificationId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("academy_notification_reads" as any)
      .upsert({ notification_id: notificationId, user_id: user.id } as any, {
        onConflict: "notification_id,user_id",
      });
    if (error) {
      console.error("Failed to mark notification read:", error);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    refetchNotifications();
  }, [user, refetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const rows = unread.map((n) => ({ notification_id: n.id, user_id: user.id }));
    const { error } = await supabase
      .from("academy_notification_reads" as any)
      .upsert(rows as any, { onConflict: "notification_id,user_id" });
    if (error) {
      console.error("Failed to mark all notifications read:", error);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    refetchNotifications();
  }, [user, notifications, refetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch: fetchNotifications,
    newArrival,
    clearNewArrival,
  };
}
