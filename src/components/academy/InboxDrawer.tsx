import { useState, useCallback, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, MessageSquare, Megaphone, Bell, Sparkles, Mail, BookOpen, Radio, X, ArrowLeft, Send, Loader2 } from "lucide-react";
import rzAvatar from "@/assets/rz-avatar.png";
import { useAcademyData, InboxItem } from "@/contexts/AcademyDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AcademyRoleBadge } from "@/components/academy/AcademyRoleBadge";
import {
  getOrCreateThread,
  findThreadByUser,
  useThreadMessages,
  sendDmMessage,
  markThreadRead,
} from "@/hooks/useDirectMessages";
import vaultLogo from "@/assets/vault-v-logo.png";

interface InboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INBOX_TYPES = ["coach_reply", "reminder"];
const WHATS_NEW_TYPES = ["announcement", "new_module", "live_scheduled"];

/* ── Type icon helper ── */
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

/* ── Sender avatar helper ── */
function SenderAvatar({ item, size = 28 }: { item: InboxItem; size?: number }) {
  const initials = item.sender_name
    ? item.sender_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "VA";

  // System item (no sender) → Vault logo
  if (!item.sender_id) {
    return (
      <Avatar style={{ width: size, height: size }} className="shrink-0">
        <AvatarImage src={vaultLogo} alt="Vault Academy" />
        <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">VA</AvatarFallback>
      </Avatar>
    );
  }

  // Personal DM / auto-DM / broadcast from operator → use RZ photo
  // If sender_avatar is an HTTP URL use it, otherwise fallback to RZ
  const avatarSrc =
    item.sender_avatar && item.sender_avatar.startsWith("http")
      ? item.sender_avatar
      : rzAvatar;

  return (
    <Avatar style={{ width: size, height: size }} className="shrink-0">
      <AvatarImage src={avatarSrc} alt={item.sender_name || "Admin"} />
      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
    </Avatar>
  );
}

function SenderName({ item }: { item: InboxItem }) {
  const name = item.sender_name || "Vault Academy";
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] font-semibold text-foreground/80">{name}</span>
      {item.sender_role && <AcademyRoleBadge roleName={item.sender_role} />}
    </span>
  );
}

/* ── Inline Thread View (reply to a DM) ── */
function InlineThreadView({
  item,
  onBack,
}: {
  item: InboxItem;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, loading: msgsLoading } = useThreadMessages(threadId);

  // Find existing thread by user, or fall back to getOrCreateThread
  useEffect(() => {
    if (!user?.id || !item.id) return;
    let cancelled = false;
    (async () => {
      // First try to find any existing thread for this user
      let id = await findThreadByUser(user.id);
      // If none exists, create one tied to this inbox item
      if (!id) {
        id = await getOrCreateThread(user.id, item.id);
      }
      if (!cancelled) {
        setThreadId(id);
        setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, item.id]);

  // Mark read
  useEffect(() => {
    if (threadId && user?.id) markThreadRead(threadId, user.id);
  }, [threadId, user?.id, messages.length]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || !user?.id || !threadId) return;
    setSending(true);
    const ok = await sendDmMessage(threadId, user.id, draft.trim());
    if (ok) setDraft("");
    setSending(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/[0.06]">
        <button onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-3 space-y-3">
          {/* Original message as first bubble */}
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-primary/15 text-sm leading-relaxed">
              <span className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-primary/80">{item.sender_name || "RZ"}</span>
                {item.sender_role && <AcademyRoleBadge roleName={item.sender_role} />}
              </span>
              <p className="whitespace-pre-wrap break-words text-foreground">{item.body}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Thread messages */}
          {initializing || msgsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? "bg-white/[0.08] text-foreground"
                        : "bg-primary/15 text-foreground"
                    }`}
                  >
                    {!isMe && <p className="text-[10px] font-semibold text-primary/80 mb-1">Vault Academy</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Reply input */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-t border-white/[0.06]">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a reply…"
          className="flex-1 bg-white/[0.04] border-white/[0.08] text-sm h-9"
          disabled={initializing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!draft.trim() || sending || initializing}
          className="h-9 w-9 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/* ── Item List (Inbox tab) ── */
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
      <div style={{ width: "100%" }}>
      {unreadCount > 0 && (
        <div className="px-4 py-2 flex justify-end">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={onMarkAllRead}>
            <Check className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        </div>
      )}
      <div className="w-full min-w-0 max-w-full pr-1 px-3 pb-4 space-y-1 box-border">
        {items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-start gap-2 w-full min-w-0 max-w-full rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.05] ${
              item.pinned ? "border border-primary/20 bg-primary/[0.03]" :
              !item.read_at ? "bg-white/[0.04] border border-[hsl(45,90%,50%)]/20" : ""
            }`}
          >
            <button
              onClick={() => onItemClick(item)}
              className="min-w-0 flex-1 w-0 flex items-start gap-2.5 text-left"
            >
              <span className="mt-0.5 shrink-0">
                <SenderAvatar item={item} size={28} />
              </span>
              {!item.read_at && (
                <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <SenderName item={item} />
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                {item.body && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.body}</p>}
                <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
            </button>
            <button
              aria-label="Dismiss"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 ml-1 flex items-center justify-center h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] opacity-50 hover:opacity-100 transition-all"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        ))}
      </div>
      </div>
    </ScrollArea>
  );
}

/* ── What's New card + list ── */

function whatsNewTypeLabel(type: string) {
  switch (type) {
    case "announcement": return "Announcement";
    case "new_module": return "New Module";
    case "live_scheduled": return "Live Session";
    default: return "Update";
  }
}

function WhatsNewCard({
  item,
  onItemClick,
  onDismiss,
}: {
  item: InboxItem;
  onItemClick: (item: InboxItem) => void;
  onDismiss: (itemId: string) => void;
}) {
  const isUnread = !item.read_at;

  return (
    <button
      onClick={() => onItemClick(item)}
      className={`relative w-full text-left min-h-[120px] rounded-2xl p-4 transition-colors bg-white/[0.04] border hover:bg-white/[0.06] hover:border-white/[0.12] ${
        isUnread ? "border-[hsl(45,90%,50%)]/20" : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <SenderAvatar item={item} size={24} />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold text-foreground/80 truncate">
            {item.sender_name || "Vault Academy"}
          </span>
          {item.sender_role && <AcademyRoleBadge roleName={item.sender_role} />}
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground ml-auto shrink-0">
          {whatsNewTypeLabel(item.type)}
        </span>
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
        )}
      </div>
      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.title}</p>
      {item.body && (
        <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">{item.body}</p>
      )}
      <p className="text-[11px] text-muted-foreground/60 mt-3">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </p>
      <span
        role="button"
        aria-label="Dismiss"
        onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
        className="absolute top-3 right-3 shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-all"
      >
        <X className="h-3.5 w-3.5 text-white" />
      </span>
    </button>
  );
}

function WhatsNewList({
  items,
  onItemClick,
  onDismiss,
  loading,
  onMarkAllRead,
  unreadCount,
}: {
  items: InboxItem[];
  onItemClick: (item: InboxItem) => void;
  onDismiss: (itemId: string) => void;
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
          <Sparkles className="h-[26px] w-[26px] text-white/[0.87] mb-4" strokeWidth={1.5} />
          <p className="text-[18px] font-semibold text-white/90 leading-snug">No updates yet</p>
          <p className="text-[14px] text-white/[0.57] mt-2">New modules, live sessions, and announcements will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div style={{ width: "100%" }}>
        {unreadCount > 0 && (
          <div className="px-4 py-2 flex justify-end">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={onMarkAllRead}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          </div>
        )}
        <div className="px-3 pb-4 space-y-3">
          {items.map((item) => (
            <WhatsNewCard key={item.id} item={item} onItemClick={onItemClick} onDismiss={onDismiss} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

/* ── Main InboxDrawer ── */
export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState("inbox");
  const [activeThread, setActiveThread] = useState<InboxItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);
  const { inboxItems: items, inboxLoading: loading, inboxUnreadCount: unreadCount, refetchInbox: refetch, markInboxRead: markRead, markAllInboxRead: markAllRead, dismissInboxItem } = useAcademyData();

  const inboxItems = items.filter((i) => INBOX_TYPES.includes(i.type));
  const whatsNewItems = items.filter((i) => WHATS_NEW_TYPES.includes(i.type));
  const inboxUnread = inboxItems.filter((i) => !i.read_at).length;
  const whatsNewUnread = whatsNewItems.filter((i) => !i.read_at).length;

  const handleClose = useCallback(() => {
    if (unreadCount > 0) markAllRead();
    setActiveThread(null);
    onOpenChange(false);
  }, [onOpenChange, unreadCount, markAllRead]);

  useEffect(() => {
    if (open && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      refetch();
    }
  }, [open, refetch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

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

    // If it's a reminder (like welcome DM), open inline thread for reply
    if (item.type === "reminder") {
      setActiveThread(item);
      return;
    }

    if (item.link) {
      onOpenChange(false);
      navigate(item.link);
    }
  };

  // If viewing a thread, show the thread view instead of tabs
  if (open && activeThread) {
    return (
      <div
        ref={panelRef}
        className={`fixed left-[var(--sidebar-width,16rem)] top-14 bottom-4 z-50 w-[340px] max-w-[90vw] flex flex-col rounded-xl border border-white/[0.08] bg-[hsl(220,18%,7%)]/95 backdrop-blur-xl shadow-2xl overflow-hidden visible pointer-events-auto`}
        style={{ marginLeft: "8px", transition: "none", animation: "none" }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-foreground">Message</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <InlineThreadView
          item={activeThread}
          onBack={() => setActiveThread(null)}
        />
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`fixed left-[var(--sidebar-width,16rem)] top-14 bottom-4 z-50 w-[340px] max-w-[90vw] flex flex-col rounded-xl border border-white/[0.08] bg-[hsl(220,18%,7%)]/95 backdrop-blur-xl shadow-2xl overflow-hidden ${
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
            onDismiss={dismissInboxItem}
            emptyMessage="No messages yet. Coach replies and reminders will appear here."
            loading={loading}
            onMarkAllRead={markAllRead}
            unreadCount={inboxUnread}
          />
        </TabsContent>

        <TabsContent value="whats-new" className="flex-1 min-h-0 mt-0 px-0 data-[state=active]:flex data-[state=active]:flex-col">
          <WhatsNewList
            items={whatsNewItems}
            onItemClick={handleClick}
            onDismiss={dismissInboxItem}
            loading={loading}
            onMarkAllRead={markAllRead}
            unreadCount={whatsNewUnread}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
