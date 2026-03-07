import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { useAcademyNotifications } from "@/hooks/useAcademyNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useOSNotifications } from "@/hooks/useOSNotifications";
import { formatRelative } from "@/lib/formatTime";

/* ── time helpers ── */
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function typeIcon(type: string) {
  switch (type) {
    case "announcement": return "📢";
    case "new_module": return "📚";
    case "coach_reply": return "💬";
    case "motivation": return "🔥";
    default: return "🔔";
  }
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refetch,
    newArrival,
    clearNewArrival,
  } = useAcademyNotifications();

  const bellRef = useRef<HTMLButtonElement>(null);

  // Re-fetch when tray is opened manually
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  // Auto-open tray when a new notification arrives via realtime
  useEffect(() => {
    if (newArrival) {
      setOpen(true);
      clearNewArrival();
    }
  }, [newArrival, clearNewArrival]);

  const handleClickItem = async (n: (typeof notifications)[0]) => {
    if (!n.is_read) await markRead(n.id);
    if (n.link_path) {
      setOpen(false);
      navigate(n.link_path);
    }
  };

  const handleClearAll = async () => {
    await markAllRead();
    setOpen(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Bell trigger */}
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,85%,55%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay + Tray */}
      {open && (
        <>
          {/* Dim overlay — clicking does NOT close (iOS feel) */}
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity" />

          {/* Tray — anchored top-right */}
          <div className="fixed top-14 right-3 z-[60] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-popover shadow-2xl shadow-black/30 animate-in slide-in-from-top-2 fade-in-0 duration-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification list — max 5 visible, scrollable for more */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(5 * 76px)" }}>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell className="h-7 w-7 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n, idx) => (
                  <button
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/40 group",
                      !n.is_read && "bg-primary/[0.04]",
                      idx !== notifications.length - 1 && "border-b border-border/40"
                    )}
                  >
                    {/* Icon */}
                    <span className="text-base mt-0.5 shrink-0 select-none">{typeIcon(n.type)}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-[13px] leading-tight truncate",
                          n.is_read ? "text-foreground/70 font-normal" : "text-foreground font-semibold"
                        )}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-[hsl(45,85%,55%)] shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{formatRelative(n.created_at)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
