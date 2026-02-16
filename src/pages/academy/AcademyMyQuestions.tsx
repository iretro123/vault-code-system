import { useState, useEffect, useCallback } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MessageSquare, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useUnreadAnswers } from "@/hooks/useUnreadAnswers";

interface Ticket {
  id: string;
  question: string;
  category: string;
  urgency: string;
  status: string;
  created_at: string;
  screenshot_url: string | null;
}

interface Reply {
  id: string;
  body: string;
  is_admin: boolean;
  user_name: string;
  created_at: string;
}

type Filter = "all" | "waiting" | "answered";

const AcademyMyQuestions = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const { unreadCount, refetch: refetchUnread } = useUnreadAnswers();

  // Track which tickets have unread admin replies
  const [ticketsWithUnread, setTicketsWithUnread] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_tickets")
      .select("id, question, category, urgency, status, created_at, screenshot_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const items = data ?? [];
    setTickets(items);
    setLoading(false);

    // Check which tickets have unread admin replies
    if (items.length > 0) {
      const ticketIds = items.map((t) => t.id);
      const { data: adminReplies } = await supabase
        .from("coach_ticket_replies")
        .select("id, ticket_id")
        .in("ticket_id", ticketIds)
        .eq("is_admin", true);

      if (adminReplies && adminReplies.length > 0) {
        const replyIds = adminReplies.map((r) => r.id);
        const { data: reads } = await supabase
          .from("coach_answer_reads" as any)
          .select("reply_id")
          .eq("user_id", user!.id)
          .in("reply_id", replyIds);
        const readSet = new Set((reads || []).map((r: any) => r.reply_id));
        const unreadTickets = new Set<string>();
        adminReplies.forEach((r) => {
          if (!readSet.has(r.id)) unreadTickets.add(r.ticket_id);
        });
        setTicketsWithUnread(unreadTickets);
      }
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelected(ticket);
    setRepliesLoading(true);
    const { data } = await supabase
      .from("coach_ticket_replies")
      .select("id, body, is_admin, user_name, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    const replyData = data ?? [];
    setReplies(replyData);
    setRepliesLoading(false);

    // Mark all admin replies in this thread as read
    if (user) {
      const adminReplyIds = replyData.filter((r) => r.is_admin).map((r) => r.id);
      if (adminReplyIds.length > 0) {
        // Check which aren't already read
        const { data: existingReads } = await supabase
          .from("coach_answer_reads" as any)
          .select("reply_id")
          .eq("user_id", user.id)
          .in("reply_id", adminReplyIds);
        const alreadyRead = new Set((existingReads || []).map((r: any) => r.reply_id));
        const toInsert = adminReplyIds
          .filter((id) => !alreadyRead.has(id))
          .map((id) => ({ user_id: user.id, reply_id: id }));
        if (toInsert.length > 0) {
          await supabase.from("coach_answer_reads" as any).insert(toInsert);
          // Update local state
          setTicketsWithUnread((prev) => {
            const next = new Set(prev);
            next.delete(ticket.id);
            return next;
          });
          refetchUnread();
        }
      }
    }
  };

  const statusLabel = (s: string) => {
    if (s === "answered" || s === "closed") return "Answered";
    return "Waiting";
  };

  const statusVariant = (s: string): "default" | "secondary" => {
    if (s === "answered" || s === "closed") return "default";
    return "secondary";
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === "waiting") return t.status !== "answered" && t.status !== "closed";
    if (filter === "answered") return t.status === "answered" || t.status === "closed";
    return true;
  });

  // Thread view
  if (selected) {
    return (
      <AcademyLayout>
        <div className="px-4 md:px-6 pb-6">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" /> Back to questions
          </button>

          <div className="max-w-2xl space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={statusVariant(selected.status)} className="text-[10px]">
                  {statusLabel(selected.status)}
                </Badge>
                <span className="text-[11px] text-muted-foreground capitalize">{selected.category}</span>
              </div>
              <h2 className="text-base font-semibold text-foreground">{selected.question}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(selected.created_at), "MMM d, yyyy · h:mm a")}
              </p>
              {selected.screenshot_url && (
                <img
                  src={selected.screenshot_url}
                  alt="Attachment"
                  className="mt-3 rounded-lg border max-h-48 object-contain"
                />
              )}
            </div>

            {repliesLoading ? (
              <p className="text-sm text-muted-foreground">Loading replies…</p>
            ) : replies.length === 0 ? (
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm">No response yet. Our coach will reply soon.</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {replies.map((r) => (
                  <Card
                    key={r.id}
                    className={cn(
                      "p-4",
                      r.is_admin && "border-primary/20 bg-primary/[0.03]"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-foreground">
                        {r.is_admin ? "Coach" : r.user_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d · h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{r.body}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </AcademyLayout>
    );
  }

  // List view
  return (
    <AcademyLayout>
      <PageHeader title="My Questions" subtitle="Your coach support history" />
      <div className="px-4 md:px-6 pb-6 max-w-2xl space-y-3">
        {/* Filter chips */}
        <div className="flex gap-2">
          {(["all", "waiting", "answered"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filteredTickets.length === 0 ? (
          <Card className="p-6 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No questions yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Use "Ask Coach" to submit your first question.
            </p>
          </Card>
        ) : (
          filteredTickets.map((t) => (
            <Card
              key={t.id}
              className="vault-card p-4 cursor-pointer hover:border-primary/30 transition-colors group"
              onClick={() => openTicket(t)}
            >
              <div className="flex items-start gap-3">
                {ticketsWithUnread.has(t.id) && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(45,90%,50%)] shrink-0" />
                )}
                <div className={cn("flex-1 min-w-0", !ticketsWithUnread.has(t.id) && "ml-5")}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusVariant(t.status)} className="text-[10px]">
                      {statusLabel(t.status)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground capitalize">{t.category}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2">{t.question}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 mt-1 shrink-0" />
              </div>
            </Card>
          ))
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyMyQuestions;
