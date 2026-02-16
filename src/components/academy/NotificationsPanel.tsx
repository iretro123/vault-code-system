import { useState, useEffect, useCallback } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  seen: boolean;
  created_at: string;
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notification_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    const items = (data as Notification[]) || [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.seen).length);
    setLoading(false);
  }, [user]);

  // Fetch on mount + when panel opens
  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.seen).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notification_log")
      .update({ seen: true })
      .eq("user_id", user.id)
      .eq("seen", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await supabase
      .from("notification_log")
      .update({ seen: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, seen: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "smart": return "Smart";
      case "reminder": return "Reminder";
      case "streak": return "Streak";
      case "support": return "Review";
      default: return "System";
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Bell icon */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-background border-l border-border shadow-xl animate-in slide-in-from-right duration-200 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold text-foreground">Notifications</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12 px-5">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">We'll nudge you when there's something to do.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.seen) markOneRead(n.id); }}
                      className={cn(
                        "w-full text-left px-5 py-4 transition-colors hover:bg-muted/30",
                        !n.seen && "bg-primary/[0.03]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {!n.seen && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
                        )}
                        <div className={cn("flex-1 min-w-0", n.seen && "ml-5")}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                              {typeLabel(n.type)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">
                              {format(new Date(n.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
