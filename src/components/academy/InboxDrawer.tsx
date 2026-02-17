import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Sparkles, Check, ExternalLink } from "lucide-react";
import { useUnreadAnswers } from "@/hooks/useUnreadAnswers";
import { useAcademyNotifications, AcademyNotification } from "@/hooks/useAcademyNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InboxDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoachReply {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
  user_name: string;
  is_read: boolean;
  ticket_question: string;
}

export function InboxDrawer({ open, onOpenChange }: InboxDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refetch: refetchUnread } = useUnreadAnswers();
  const { notifications, markRead, markAllRead, unreadCount: notifUnreadCount } = useAcademyNotifications();
  const [coachReplies, setCoachReplies] = useState<CoachReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [tab, setTab] = useState("inbox");

  const fetchCoachReplies = useCallback(async () => {
    if (!user) return;
    setLoadingReplies(true);

    const { data: tickets } = await supabase
      .from("coach_tickets")
      .select("id, question")
      .eq("user_id", user.id);

    if (!tickets || tickets.length === 0) {
      setCoachReplies([]);
      setLoadingReplies(false);
      return;
    }

    const ticketMap = new Map(tickets.map((t) => [t.id, t.question]));
    const ticketIds = tickets.map((t) => t.id);

    const { data: replies } = await supabase
      .from("coach_ticket_replies")
      .select("id, ticket_id, body, created_at, user_name, is_admin")
      .in("ticket_id", ticketIds)
      .eq("is_admin", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!replies || replies.length === 0) {
      setCoachReplies([]);
      setLoadingReplies(false);
      return;
    }

    const replyIds = replies.map((r) => r.id);
    const { data: reads } = await supabase
      .from("coach_answer_reads" as any)
      .select("reply_id")
      .eq("user_id", user.id)
      .in("reply_id", replyIds);

    const readSet = new Set((reads || []).map((r: any) => r.reply_id));

    setCoachReplies(
      replies.map((r) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        body: r.body,
        created_at: r.created_at,
        user_name: r.user_name,
        is_read: readSet.has(r.id),
        ticket_question: ticketMap.get(r.ticket_id) || "Your question",
      }))
    );
    setLoadingReplies(false);
  }, [user]);

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen);
      if (isOpen) {
        fetchCoachReplies();
      }
    },
    [onOpenChange, fetchCoachReplies]
  );

  const markReplyRead = useCallback(
    async (replyId: string) => {
      if (!user) return;
      await supabase
        .from("coach_answer_reads" as any)
        .upsert({ reply_id: replyId, user_id: user.id } as any, {
          onConflict: "reply_id,user_id",
        });
      setCoachReplies((prev) =>
        prev.map((r) => (r.id === replyId ? { ...r, is_read: true } : r))
      );
      refetchUnread();
    },
    [user, refetchUnread]
  );

  const markAllRepliesRead = useCallback(async () => {
    if (!user) return;
    const unread = coachReplies.filter((r) => !r.is_read);
    if (unread.length === 0) return;
    const rows = unread.map((r) => ({ reply_id: r.id, user_id: user.id }));
    await supabase
      .from("coach_answer_reads" as any)
      .upsert(rows as any, { onConflict: "reply_id,user_id" });
    setCoachReplies((prev) => prev.map((r) => ({ ...r, is_read: true })));
    refetchUnread();
  }, [user, coachReplies, refetchUnread]);

  const inboxUnread = coachReplies.filter((r) => !r.is_read).length;

  const handleNotifClick = (n: AcademyNotification) => {
    if (!n.is_read) markRead(n.id);
    if (n.link_path) {
      onOpenChange(false);
      navigate(n.link_path);
    }
  };

  const handleReplyClick = (r: CoachReply) => {
    if (!r.is_read) markReplyRead(r.id);
    onOpenChange(false);
    navigate("/academy/my-questions");
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-lg font-semibold">Inbox</SheetTitle>
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
              {notifUnreadCount > 0 && (
                <span className="flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[hsl(45,90%,50%)] text-[hsl(45,90%,10%)] text-[10px] font-bold leading-none">
                  {notifUnreadCount > 9 ? "9+" : notifUnreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="flex-1 min-h-0 mt-0 px-0">
            <ScrollArea className="h-full">
              {inboxUnread > 0 && (
                <div className="px-5 py-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-7"
                    onClick={markAllRepliesRead}
                  >
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </Button>
                </div>
              )}
              <div className="px-3 pb-4 space-y-1">
                {loadingReplies ? (
                  <div className="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</div>
                ) : coachReplies.length === 0 ? (
                  <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Coach replies will appear here.
                  </div>
                ) : (
                  coachReplies.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleReplyClick(r)}
                      className={`w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 ${
                        !r.is_read ? "bg-muted/40 border border-[hsl(45,90%,50%)]/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!r.is_read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.user_name} replied
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Re: {r.ticket_question}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="whats-new" className="flex-1 min-h-0 mt-0 px-0">
            <ScrollArea className="h-full">
              {notifUnreadCount > 0 && (
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
                {notifications.length === 0 ? (
                  <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No announcements yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left rounded-lg px-3 py-3 transition-colors hover:bg-muted/60 ${
                        !n.is_read ? "bg-muted/40 border border-[hsl(45,90%,50%)]/20" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {n.link_path && (
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
