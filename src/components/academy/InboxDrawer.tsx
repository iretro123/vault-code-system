import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ExternalLink, MessageSquare, Megaphone, Bell, Sparkles, Mail, BookOpen, Radio, X } from "lucide-react";
import { useAcademyData, InboxItem } from "@/contexts/AcademyDataContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INBOX_TYPES = ["coach_reply", "reminder"];
const WHATS_NEW_TYPES = ["announcement", "new_module", "live_scheduled"];

function typeIcon(type: string) {
  switch (type) {
    case "coach_reply": return <MessageSquare className="h-4 w-4 text-[hsl(45,90%,50%)]" />;
    case "announcement": return <Megaphone className="h-4 w-4 text-primary" />;
    case "reminder": return <Bell className="h-4 w-4 text-muted-foreground" />;
    case "new_module": return <BookOpen className="h-4 w-4 text-primary" />;
    case "live_scheduled": return <Radio className="h-4 w-4 text-[hsl(200,80%,65%)]" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function ItemList({
  items,
  onItemClick,
  onDismiss,
  emptyMessage,
  loading,
  onMarkAllRead,
  unreadCount,
}: {
  items: InboxItem[];
  onItemClick: (item: InboxItem) => void;
  onDismiss: (itemId: string) => void;
  emptyMessage: string;
  loading: boolean;
  onMarkAllRead: () => void;
  unreadCount: number;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center">
        <div className="flex flex-col items-center gap-0">
          <Mail className="h-[26px] w-[26px] text-white/[0.87] mb-4" strokeWidth={1.5} />
          <p className="text-[18px] font-semibold text-white/90 leading-snug">{emptyMessage.split('.')[0]}</p>
          <p className="text-[14px] text-white/[0.57] mt-2">{emptyMessage.split('.').slice(1).join('.').trim()}</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      {unreadCount > 0 && (
        <div className="px-4 py-2 flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={onMarkAllRead}>
            <Check className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        </div>
      )}
      <div className="px-3 pb-4 space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className={`group w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.05] relative ${
              item.pinned ? "border border-primary/20 bg-primary/[0.03]" :
              !item.read_at ? "bg-white/[0.04] border border-[hsl(45,90%,50%)]/20" : ""
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{typeIcon(item.type)}</span>
              {!item.read_at && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate pr-5">{item.title}</p>
                {item.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
              {item.link && (
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
              )}
            </div>
            {/* Dismiss X */}
            <span
              role="button"
              aria-label="Dismiss"
              onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
              className="absolute top-2.5 right-2.5 p-1 rounded-md opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-white/[0.08] transition-opacity cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("inbox");
  const panelRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);
  const { inboxItems: items, inboxLoading: loading, inboxUnreadCount: unreadCount, refetchInbox: refetch, markInboxRead: markRead, markAllInboxRead: markAllRead } = useAcademyData();

  const inboxItems = items.filter((i) => INBOX_TYPES.includes(i.type));
  const whatsNewItems = items.filter((i) => WHATS_NEW_TYPES.includes(i.type));
  const inboxUnread = inboxItems.filter((i) => !i.read_at).length;
  const whatsNewUnread = whatsNewItems.filter((i) => !i.read_at).length;

  const handleClose = useCallback(() => {
    if (unreadCount > 0) markAllRead();
    onOpenChange(false);
  }, [onOpenChange, unreadCount, markAllRead]);

  // Fetch once on first open, then background-refresh
  useEffect(() => {
    if (open && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refetch();
    }
  }, [open, refetch]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-inbox-trigger]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        handleClose();
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", onClick), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", onClick); };
  }, [open, handleClose]);

  const handleClick = (item: InboxItem) => {
    if (!item.read_at) markRead(item.id);
    if (item.link) {
      onOpenChange(false);
      navigate(item.link);
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed left-[var(--sidebar-width,16rem)] top-14 bottom-4 z-50 w-[400px] flex flex-col rounded-xl border border-white/[0.08] bg-[hsl(220,18%,7%)]/95 backdrop-blur-xl shadow-2xl ${
        open ? "visible pointer-events-auto" : "invisible pointer-events-none"
      }`}
      style={{ marginLeft: "8px", transition: "none", animation: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <h2 className="text-base font-semibold text-foreground">Inbox</h2>
        <button
          onClick={handleClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 mb-1 grid grid-cols-2 h-9 bg-white/[0.04]">
          <TabsTrigger value="inbox" className="text-xs gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Inbox
            {inboxUnread > 0 && (
              <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                {inboxUnread > 9 ? "9+" : inboxUnread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="whats-new" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            What's New
            {whatsNewUnread > 0 && (
              <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                {whatsNewUnread > 9 ? "9+" : whatsNewUnread}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="flex-1 min-h-0 mt-0 px-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ItemList
            items={inboxItems}
            onItemClick={handleClick}
            emptyMessage="No messages yet. Coach replies and reminders will appear here."
            loading={loading}
            onMarkAllRead={markAllRead}
            unreadCount={inboxUnread}
          />
        </TabsContent>

        <TabsContent value="whats-new" className="flex-1 min-h-0 mt-0 px-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ItemList
            items={whatsNewItems}
            onItemClick={handleClick}
            emptyMessage="No updates yet. New modules, live sessions, and announcements will appear here."
            loading={loading}
            onMarkAllRead={markAllRead}
            unreadCount={whatsNewUnread}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
