import { useState, useEffect, useCallback, useRef } from "react";
import { HelpCircle, X, Loader2, Send, ChevronLeft, Image, Clock, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Platform", "Options Basics", "Risk", "Mindset", "Trade Review"] as const;

interface Ticket {
  id: string;
  category: string;
  urgency: string;
  question: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

interface Reply {
  id: string;
  ticket_id: string;
  user_id: string;
  user_name: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

type View = "new" | "list" | "detail";

export function AskCoachButton() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("new");

  // New ticket form
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("standard");
  const [question, setQuestion] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ticket list
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Detail view
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setTicketsLoading(true);
    const { data } = await supabase
      .from("coach_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTickets((data as Ticket[]) || []);
    setTicketsLoading(false);
  }, [user]);

  const fetchReplies = useCallback(async (ticketId: string) => {
    setRepliesLoading(true);
    const { data } = await supabase
      .from("coach_ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setReplies((data as Reply[]) || []);
    setRepliesLoading(false);
  }, []);

  useEffect(() => {
    if (open && view === "list") fetchTickets();
  }, [open, view, fetchTickets]);

  useEffect(() => {
    if (activeTicket) fetchReplies(activeTicket.id);
  }, [activeTicket, fetchReplies]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setSending(true);

    let screenshotUrl: string | null = null;

    // Upload screenshot if provided
    if (screenshotFile) {
      const ext = screenshotFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("ticket-screenshots")
        .upload(path, screenshotFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("ticket-screenshots")
          .getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("coach_tickets").insert({
      user_id: user.id,
      category,
      urgency,
      question: question.trim(),
      screenshot_url: screenshotUrl,
    } as any);

    setSending(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Got it.", description: "You'll see replies here." });
      setQuestion("");
      setCategory(CATEGORIES[0]);
      setUrgency("standard");
      setScreenshotFile(null);
      setView("list");
      fetchTickets();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplySending(true);
    const userName = profile?.display_name || user.email?.split("@")[0] || "User";
    await supabase.from("coach_ticket_replies").insert({
      ticket_id: activeTicket.id,
      user_id: user.id,
      user_name: userName,
      body: replyText.trim(),
      is_admin: false,
    } as any);
    setReplyText("");
    setReplySending(false);
    fetchReplies(activeTicket.id);
  };

  const openTicketDetail = (ticket: Ticket) => {
    setActiveTicket(ticket);
    setView("detail");
  };

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === "waiting") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    return <Clock className="h-3 w-3 text-blue-400" />;
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setView("new"); }}
        className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Ask Coach</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md mx-4 mb-4 md:mb-0 rounded-xl border border-border bg-background shadow-xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                {view !== "new" && (
                  <button
                    onClick={() => { setView(view === "detail" ? "list" : "new"); setActiveTicket(null); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <h3 className="font-semibold text-foreground text-sm">
                  {view === "new" ? "Ask a Coach" : view === "list" ? "My Questions" : activeTicket?.category}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {view === "new" && (
                  <button
                    onClick={() => setView("list")}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="My Questions"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {view === "new" && (
                <div className="space-y-4">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Urgency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Urgency</label>
                    <div className="flex gap-2">
                      {["standard", "priority"].map((u) => (
                        <button
                          key={u}
                          onClick={() => setUrgency(u)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                            urgency === u
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Your Question</label>
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Describe what you need help with…"
                      className="resize-none"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>

                  {/* Screenshot */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Screenshot (optional)</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    />
                    {screenshotFile ? (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate flex-1">{screenshotFile.name}</span>
                        <button onClick={() => setScreenshotFile(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Image className="h-3.5 w-3.5" />
                        Attach Screenshot
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!question.trim() || sending}
                    className="w-full gap-2"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Submitting…" : "Submit Question"}
                  </Button>
                </div>
              )}

              {view === "list" && (
                <div className="space-y-2">
                  {ticketsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No questions yet.</p>
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setView("new")}>
                        Ask your first question
                      </Button>
                    </div>
                  ) : (
                    tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTicketDetail(t)}
                        className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{statusIcon(t.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {t.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 capitalize">{t.status}</span>
                            </div>
                            <p className="text-sm text-foreground line-clamp-2">{t.question}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                              {format(new Date(t.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {view === "detail" && activeTicket && (
                <div className="space-y-4">
                  {/* Ticket info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(activeTicket.status)}
                      <span className="text-xs font-medium capitalize">{activeTicket.status}</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {format(new Date(activeTicket.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{activeTicket.question}</p>
                    {activeTicket.screenshot_url && (
                      <a href={activeTicket.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={activeTicket.screenshot_url}
                          alt="Screenshot"
                          className="rounded-lg border border-border max-h-40 object-cover"
                        />
                      </a>
                    )}
                  </div>

                  {/* Replies */}
                  <div className="border-t border-border pt-3 space-y-3">
                    {repliesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : replies.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No replies yet. A coach will respond soon.
                      </p>
                    ) : (
                      replies.map((r) => (
                        <div key={r.id} className={cn("rounded-lg p-3 text-sm", r.is_admin ? "bg-primary/5 border border-primary/10" : "bg-muted")}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-xs font-semibold", r.is_admin ? "text-primary" : "text-foreground")}>
                              {r.user_name}
                              {r.is_admin && <span className="text-[10px] ml-1 font-normal text-primary/60">Coach</span>}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50">
                              {format(new Date(r.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-foreground/90 whitespace-pre-line">{r.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply input */}
                  {activeTicket.status !== "resolved" && (
                    <div className="flex gap-2">
                      <Input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add a reply…"
                        className="flex-1"
                        maxLength={500}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                      />
                      <Button size="icon" onClick={handleReply} disabled={!replyText.trim() || replySending}>
                        {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
