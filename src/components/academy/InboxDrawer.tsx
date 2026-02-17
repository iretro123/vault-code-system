import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ExternalLink, MessageSquare, Megaphone, Bell, Sparkles, Mail, BookOpen, Radio } from "lucide-react";
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
  emptyMessage,
  loading,
  onMarkAllRead,
  unreadCount,
}: {
  items: InboxItem[];
  onItemClick: (item: InboxItem) => void;
  emptyMessage: string;
  loading: boolean;
  onMarkAllRead: () => void;
  unreadCount: number;
}) {
  return (
    <ScrollArea className="h-full">
      {unreadCount > 0 && (
        <div className="px-5 py-2 flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={onMarkAllRead}>
            <Check className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        </div>
      )}
      <div className="px-3 pb-4 space-y-1">
        {loading ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className={`w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 ${
                    item.pinned ? "border border-primary/20 bg-primary/[0.03]" :
                    !item.read_at ? "bg-muted/40 border border-[hsl(45,90%,50%)]/20" : ""
                  }`}
                >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{typeIcon(item.type)}</span>
                {!item.read_at && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {item.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {item.link && (
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("inbox");
  const { inboxItems: items, inboxLoading: loading, inboxUnreadCount: unreadCount, refetchInbox: refetch, markInboxRead: markRead, markAllInboxRead: markAllRead } = useAcademyData();

  const inboxItems = items.filter((i) => INBOX_TYPES.includes(i.type));
  const whatsNewItems = items.filter((i) => WHATS_NEW_TYPES.includes(i.type));
  const inboxUnread = inboxItems.filter((i) => !i.read_at).length;
  const whatsNewUnread = whatsNewItems.filter((i) => !i.read_at).length;

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && unreadCount > 0) markAllRead();
      onOpenChange(isOpen);
      if (isOpen) refetch();
    },
    [onOpenChange, refetch, unreadCount, markAllRead]
  );

  const handleClick = (item: InboxItem) => {
    if (!item.read_at) markRead(item.id);
    if (item.link) {
      onOpenChange(false);
      navigate(item.link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-[hsl(220,20%,8%)]/95 backdrop-blur-xl border-l border-white/[0.08]">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <SheetTitle className="text-lg font-semibold text-foreground">Inbox</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 mb-1 grid grid-cols-2 h-9">
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

          <TabsContent value="inbox" className="flex-1 min-h-0 mt-0 px-0">
            <ItemList
              items={inboxItems}
              onItemClick={handleClick}
              emptyMessage="No messages yet. Coach replies and reminders will appear here."
              loading={loading}
              onMarkAllRead={markAllRead}
              unreadCount={inboxUnread}
            />
          </TabsContent>

          <TabsContent value="whats-new" className="flex-1 min-h-0 mt-0 px-0">
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
      </SheetContent>
    </Sheet>
  );
}
