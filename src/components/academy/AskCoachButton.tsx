import { useState, useEffect, useCallback, useRef } from "react";
import { HelpCircle, X, Loader2, Send, ChevronLeft, Image, Clock, CheckCircle2, AlertCircle, MessageSquare, Zap, History, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime, formatDateShort } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const CATEGORIES = ["Platform", "Options Basics", "Risk", "Mindset", "Trade Review"] as const;

const QUESTION_TEMPLATES: Record<string, string> = {
  "None": "",
  "Trade Review": `Ticker: 
Entry price: 
Stop loss: 
Thesis (why I took it): 
What happened: `,
  "Risk / Sizing": `Account size: 
Max loss per trade: 
Contract cost: 
My plan: `,
  "Platform Help": `Broker / Platform: 
What I clicked: 
What happened: 
(Attach a screenshot if possible)`,
};

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

interface InstantAnswer {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

type Tab = "coach" | "instant";
type CoachView = "new" | "list" | "detail";
type InstantView = "ask" | "history";

function CopyAnswerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AskCoachButton() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("coach");

  // Coach tab state
  const [coachView, setCoachView] = useState<CoachView>("new");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("standard");
  const [question, setQuestion] = useState("");
  const [template, setTemplate] = useState("None");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  // Instant answer tab state
  const [instantQ, setInstantQ] = useState("");
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantResult, setInstantResult] = useState<{ question: string; answer: string } | null>(null);
  const [instantView, setInstantView] = useState<InstantView>("ask");
  const [pastAnswers, setPastAnswers] = useState<InstantAnswer[]>([]);
  const [pastLoading, setPastLoading] = useState(false);

  // Detect if chat composer is focused to nudge the button up
  const [composerFocused, setComposerFocused] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "TEXTAREA" && target.closest("[data-chat-composer]")) {
        setComposerFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "TEXTAREA" && target.closest("[data-chat-composer]")) {
        setComposerFocused(false);
      }
    };
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

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

  const fetchPastAnswers = useCallback(async () => {
    if (!user) return;
    setPastLoading(true);
    const { data } = await supabase
      .from("instant_answers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setPastAnswers((data as InstantAnswer[]) || []);
    setPastLoading(false);
  }, [user]);

  useEffect(() => {
    if (open && tab === "coach" && coachView === "list") fetchTickets();
  }, [open, tab, coachView, fetchTickets]);

  useEffect(() => {
    if (activeTicket) fetchReplies(activeTicket.id);
  }, [activeTicket, fetchReplies]);

  useEffect(() => {
    if (open && tab === "instant" && instantView === "history") fetchPastAnswers();
  }, [open, tab, instantView, fetchPastAnswers]);

  if (!user) return null;

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setSending(true);
    let screenshotUrl: string | null = null;
    if (screenshotFile) {
      const ext = screenshotFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("ticket-screenshots").upload(path, screenshotFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("ticket-screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }
    const { error } = await supabase.from("coach_tickets").insert({
      user_id: user.id, category, urgency, question: question.trim(), screenshot_url: screenshotUrl,
    } as any);
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Got it.", description: "You'll see replies here." });
      setQuestion(""); setCategory(CATEGORIES[0]); setUrgency("standard"); setScreenshotFile(null); setTemplate("None");
      setCoachView("list"); fetchTickets();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplySending(true);
    const userName = profile?.display_name || user.email?.split("@")[0] || "User";
    await supabase.from("coach_ticket_replies").insert({
      ticket_id: activeTicket.id, user_id: user.id, user_name: userName, body: replyText.trim(), is_admin: false,
    } as any);
    setReplyText(""); setReplySending(false); fetchReplies(activeTicket.id);
  };

  const handleInstantAsk = async () => {
    if (!instantQ.trim()) return;
    setInstantLoading(true);
    setInstantResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("instant-answer", {
        body: { question: instantQ.trim() },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setInstantLoading(false);
        return;
      }
      const answer = data?.answer || "No answer generated.";
      setInstantResult({ question: instantQ.trim(), answer });
      // Save to DB
      await supabase.from("instant_answers").insert({
        user_id: user.id, question: instantQ.trim(), answer,
      } as any);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to get answer", variant: "destructive" });
    }
    setInstantLoading(false);
  };

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === "waiting") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    return <Clock className="h-3 w-3 text-blue-400" />;
  };




  return (
    <>
      {/* Speech-bubble floating button */}
      <button
        onClick={() => { setOpen(true); setTab("coach"); setCoachView("new"); }}
        className={cn(
          "fixed z-[60] group transition-all duration-300 ease-out",
          // Small <768px: circular icon, safe above mobile nav + composer
          "bottom-[120px] right-4",
          // Medium 768-1280px
          "md:bottom-[132px] md:right-6",
          // Large >1280px
          "xl:bottom-[140px] xl:right-8",
          // Nudge up when composer is focused
          composerFocused && "translate-y-[-12px]",
        )}
      >
        {/* Speech bubble shape */}
        <div className={cn(
          "relative flex items-center gap-2 rounded-2xl shadow-lg transition-all duration-200",
          "bg-foreground text-background",
          "hover:shadow-xl hover:scale-105 active:scale-95",
          // Small: circular icon only
          "p-3 rounded-full",
          // Medium+: pill with text
          "md:px-4 md:py-2.5 md:rounded-2xl",
        )}>
          <HelpCircle className="h-[18px] w-[18px] shrink-0" />
          <span className="text-sm font-semibold hidden md:inline">Ask Coach</span>
        </div>

        {/* Tail / pointer - hidden on small screens */}
        <div className="absolute -bottom-[6px] right-5 w-3 h-3 rotate-45 bg-foreground rounded-sm shadow-lg hidden md:block" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={() => setOpen(false)} />
          <div className="relative w-[min(760px,calc(100vw-48px))] rounded-t-2xl md:rounded-xl border border-white/[0.08] bg-[linear-gradient(180deg,#0E1218_0%,#0A0E14_100%)] shadow-[0_12px_60px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] animate-in slide-in-from-bottom-4 duration-200 h-[95vh] md:h-auto md:max-h-[80vh] flex flex-col overflow-hidden">

            {/* Segmented tab header */}
            <div className="flex shrink-0 sticky top-0 z-10 rounded-t-2xl md:rounded-t-xl bg-white/[0.03]">
              <button
                onClick={() => { setTab("coach"); setCoachView("new"); }}
                className={cn(
                  "flex-1 py-4 text-sm font-medium transition-colors relative flex flex-col items-center gap-0.5",
                  tab === "coach" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Coach</span>
                <span className="text-[11px] font-normal text-muted-foreground/70">Human response</span>
                {tab === "coach" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-full" />}
              </button>
              <button
                onClick={() => { setTab("instant"); setInstantView("ask"); setInstantResult(null); }}
                className={cn(
                  "flex-1 py-4 text-sm font-medium transition-colors relative flex flex-col items-center gap-0.5",
                  tab === "instant" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" style={{ color: tab === "instant" ? "#FACC15" : undefined }} /> Instant Answer</span>
                <span className="text-[11px] font-normal text-muted-foreground/70">Fast education</span>
                {tab === "instant" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#FACC15] rounded-full" />}
              </button>
            </div>
            <div className="h-px bg-white/[0.06]" />

            {/* Sub-header for coach tab */}
            {tab === "coach" && (
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  {coachView !== "new" && (
                    <button onClick={() => { setCoachView(coachView === "detail" ? "list" : "new"); setActiveTicket(null); }} className="text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <h3 className="font-bold text-foreground text-xl">
                    {coachView === "new" ? "Ask a Coach" : coachView === "list" ? "My Questions" : activeTicket?.category}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {coachView === "new" && (
                    <button onClick={() => setCoachView("list")} className="text-muted-foreground hover:text-foreground p-1" title="My Questions">
                      <MessageSquare className="h-5 w-5" />
                    </button>
                  )}
                   <button onClick={() => setOpen(false)} className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Sub-header for instant tab */}
            {tab === "instant" && (
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  {instantView === "history" && (
                    <button onClick={() => { setInstantView("ask"); }} className="text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  <h3 className="font-bold text-foreground text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5" style={{ color: "#FACC15" }} />
                    {instantView === "ask" ? "Instant Answer" : "Past Answers"}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {instantView === "ask" && (
                    <button onClick={() => setInstantView("history")} className="text-muted-foreground hover:text-foreground p-1" title="Past Answers">
                      <History className="h-5 w-5" />
                    </button>
                  )}
                   <button onClick={() => setOpen(false)} className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 md:px-7 md:py-6">

              {/* ========== COACH TAB ========== */}
              {tab === "coach" && coachView === "new" && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80 tracking-wide">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 text-base leading-relaxed focus:ring-[rgba(59,130,246,0.35)]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-base">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80 tracking-wide">Urgency</label>
                    <div className="flex gap-2">
                      {["standard", "priority"].map((u) => (
                        <button key={u} onClick={() => setUrgency(u)} className={cn(
                          "px-5 py-3 h-12 rounded-lg text-base font-medium transition-colors capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(59,130,246,0.35)]",
                          urgency === u ? "bg-primary text-primary-foreground" : "bg-white/[0.04] text-muted-foreground hover:text-foreground border border-white/[0.08]"
                        )}>{u}</button>
                      ))}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {urgency === "priority" ? "Priority: faster response" : "Standard: within 2–4 hours"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80 tracking-wide">Question Template</label>
                    <Select value={template} onValueChange={(val) => {
                      setTemplate(val);
                      if (val !== "None") setQuestion(QUESTION_TEMPLATES[val]);
                    }}>
                      <SelectTrigger className="h-12 text-base leading-relaxed focus:ring-[rgba(59,130,246,0.35)]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-[60]">
                        {Object.keys(QUESTION_TEMPLATES).map((t) => <SelectItem key={t} value={t} className="text-base">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[13px] text-muted-foreground">Optional — pick a template to get started faster</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80 tracking-wide">Your Question</label>
                    <p className="text-[13px] text-muted-foreground">Keep it simple: what you tried + what happened + what you want.</p>
                    <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What's going on? Describe the situation, what you tried, and where you're stuck…" className="resize-none text-base min-h-[160px] leading-[1.5] placeholder:text-[15px] py-3.5 px-4 focus-visible:ring-[rgba(59,130,246,0.35)]" rows={8} maxLength={1000} />
                    <p className="text-[13px] text-muted-foreground">e.g. "I keep revenge trading after a loss — how do I build a cooldown routine?"</p>
                  </div>
                  <div className="space-y-3">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                    {screenshotFile ? (
                      <div className="flex items-center gap-2 text-base text-foreground">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate flex-1">{screenshotFile.name}</span>
                        <button onClick={() => setScreenshotFile(null)} className="text-muted-foreground hover:text-foreground p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2 text-base h-12 px-4 w-full sm:w-auto border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => fileRef.current?.click()}>
                        <span>📎</span> Attach Screenshot
                      </Button>
                    )}
                  </div>
                  <div className="sticky bottom-0 pt-4 pb-1 -mx-6 px-6 md:-mx-7 md:px-7 border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0E1218 0%, #0A0E14 100%)' }}>
                    <Button onClick={handleSubmit} disabled={!question.trim() || sending} className="w-full gap-2 h-14 text-[17px] font-semibold">
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      {sending ? "Submitting…" : "Submit Question"}
                    </Button>
                  </div>
                </div>
              )}

              {tab === "coach" && coachView === "list" && (
                <div className="space-y-3">
                  {ticketsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No questions yet.</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-sm" onClick={() => setCoachView("new")}>Ask your first question</Button>
                    </div>
                  ) : tickets.map((t) => (
                    <button key={t.id} onClick={() => { setActiveTicket(t); setCoachView("detail"); }} className="w-full text-left rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{statusIcon(t.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">{t.category}</span>
                            <span className="text-xs text-muted-foreground/60 capitalize">{t.status}</span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-2">{t.question}</p>
                          <p className="text-xs text-muted-foreground/50 mt-1">{formatDateTime(t.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {tab === "coach" && coachView === "detail" && activeTicket && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(activeTicket.status)}
                      <span className="text-sm font-medium capitalize">{activeTicket.status}</span>
                      <span className="text-xs text-muted-foreground/50">{formatDateTime(activeTicket.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{activeTicket.question}</p>
                    {activeTicket.screenshot_url && (
                      <a href={activeTicket.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img src={activeTicket.screenshot_url} alt="Screenshot" className="rounded-lg border border-border max-h-40 object-cover" />
                      </a>
                    )}
                  </div>
                  <div className="border-t border-border pt-3 space-y-3">
                    {repliesLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                    ) : replies.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No replies yet. A coach will respond soon.</p>
                    ) : replies.map((r) => (
                      <div key={r.id} className={cn("rounded-lg p-4 text-sm", r.is_admin ? "bg-primary/5 border border-primary/10" : "bg-muted")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-sm font-semibold", r.is_admin ? "text-primary" : "text-foreground")}>
                            {r.user_name}
                            {r.is_admin && <span className="text-xs ml-1 font-normal text-primary/60">Coach</span>}
                          </span>
                          <span className="text-xs text-muted-foreground/50">{formatDateTime(r.created_at)}</span>
                        </div>
                        <p className="text-foreground/90 whitespace-pre-line leading-relaxed">{r.body}</p>
                      </div>
                    ))}
                  </div>
                  {activeTicket.status !== "resolved" && (
                    <div className="sticky bottom-0 bg-background pt-3 pb-1 -mx-5 px-5 md:-mx-6 md:px-6 border-t border-border">
                      <div className="flex gap-2">
                        <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Add a reply…" className="flex-1 h-10 text-sm" maxLength={500}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }} />
                        <Button size="icon" className="h-10 w-10" onClick={handleReply} disabled={!replyText.trim() || replySending}>
                          {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========== INSTANT ANSWER TAB ========== */}
              {tab === "instant" && instantView === "ask" && (
                <div className="space-y-5">
                  <p className="text-[14px] text-muted-foreground">Ask any trading education question. No signals or price targets — just frameworks and checklists.</p>
                  <Textarea
                    value={instantQ}
                    onChange={(e) => setInstantQ(e.target.value)}
                    placeholder="Type your question here — be as specific as you can…"
                    className="resize-none text-base min-h-[160px] leading-[1.5] placeholder:text-[15px] py-3.5 px-4 focus-visible:ring-[rgba(250,204,21,0.35)]"
                    rows={7}
                    maxLength={500}
                  />
                  <p className="text-[13px] text-muted-foreground">e.g. "How should I size my position after a losing streak?"</p>
                  <div className="sticky bottom-0 pt-4 pb-1 -mx-6 px-6 md:-mx-7 md:px-7 border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0E1218 0%, #0A0E14 100%)' }}>
                    <Button
                      onClick={handleInstantAsk}
                      disabled={!instantQ.trim() || instantLoading}
                      className="w-full gap-2 h-14 text-[17px] font-semibold"
                    >
                      {instantLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" style={{ color: "#FACC15" }} />}
                      {instantLoading ? "Thinking…" : "Get Answer"}
                    </Button>
                  </div>

                  {instantResult && (
                    <div className="space-y-4 pt-2">
                      {/* User question bubble */}
                      <div className="flex justify-end">
                        <div className="rounded-xl rounded-tr-sm bg-primary/10 border border-primary/15 px-4 py-3 max-w-[85%]">
                          <p className="text-sm text-foreground leading-relaxed">{instantResult.question}</p>
                        </div>
                      </div>

                      {/* AI answer bubble */}
                      <div className="flex justify-start">
                        <div className="rounded-xl rounded-tl-sm bg-muted border border-border px-4 py-4 max-w-[95%] space-y-3">
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed [&_strong]:text-foreground [&_li]:text-foreground/90">
                            <ReactMarkdown>{instantResult.answer}</ReactMarkdown>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <CopyAnswerButton text={instantResult.answer} />
                            <p className="text-[10px] text-muted-foreground/50">Education only · No signals · No price targets</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "instant" && instantView === "history" && (
                <div className="space-y-3">
                  {pastLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : pastAnswers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No past answers yet.</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-sm" onClick={() => setInstantView("ask")}>Ask your first question</Button>
                    </div>
                  ) : pastAnswers.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{a.question}</p>
                        <span className="text-xs text-muted-foreground/50 shrink-0 ml-2">{formatDateShort(a.created_at)}</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/80 leading-relaxed [&_strong]:text-foreground [&_li]:text-foreground/80">
                        <ReactMarkdown>{a.answer}</ReactMarkdown>
                      </div>
                    </div>
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
