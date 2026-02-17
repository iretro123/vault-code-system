import { useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check, ExternalLink, MessageSquare, Megaphone, Bell } from "lucide-react";
import { useInboxItems, InboxItem } from "@/hooks/useInboxItems";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function typeIcon(type: string) {
  switch (type) {
    case "coach_reply": return <MessageSquare className="h-4 w-4 text-[hsl(45,90%,50%)]" />;
    case "announcement": return <Megaphone className="h-4 w-4 text-primary" />;
    case "reminder": return <Bell className="h-4 w-4 text-muted-foreground" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const navigate = useNavigate();
  const { items, loading, unreadCount, refetch, markRead, markAllRead } = useInboxItems();

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && unreadCount > 0) {
        markAllRead();
      }
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
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-lg font-semibold">Inbox</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          {unreadCount > 0 && (
            <div className="px-5 py-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={markAllRead}
              >
                <Check className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            </div>
          )}
          <div className="px-3 pb-4 space-y-1">
            {loading ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No messages yet. Coach replies, announcements, and reminders will appear here.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 ${
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
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
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
      </SheetContent>
    </Sheet>
  );
}
