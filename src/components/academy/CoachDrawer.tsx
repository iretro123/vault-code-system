import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, X, Loader2, Send, ChevronLeft, Image,
  Clock, CheckCircle2, AlertCircle, Zap, History, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

const CATEGORIES = ["Platform", "Options Basics", "Risk", "Mindset", "Trade Review"] as const;

const QUESTION_TEMPLATES: Record<string, string> = {
  None: "",
  "Trade Review": `Ticker: \nEntry price: \nStop loss: \nThesis (why I took it): \nWhat happened: `,
  "Risk / Sizing": `Account size: \nMax loss per trade: \nContract cost: \nMy plan: `,
  "Platform Help": `Broker / Platform: \nWhat I clicked: \nWhat happened: \n(Attach a screenshot if possible)`,
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

function CopyButton({ text }: { text: string }) {
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

type View = "menu" | "ask" | "list" | "detail" | "answered";

export function CoachDrawer() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");

  // Form state
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("standard");
  const [question, setQuestion] = useState("");
  const [template, setTemplate] = useState("None");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
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
    if (open && (view === "list" || view === "answered")) fetchTickets();
  }, [open, view, fetchTickets]);

  useEffect(() => {
    if (activeTicket) fetchReplies(activeTicket.id);
  }, [activeTicket, fetchReplies]);

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
      toast({ title: "Submitted", description: "You'll see replies under My Questions." });
      setQuestion("");
      setCategory(CATEGORIES[0]);
      setUrgency("standard");
      setScreenshotFile(null);
      setTemplate("None");
      setView("list");
      fetchTickets();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplySending(true);
    const userName = profile?.display_name || user.email?.split("@")[0] || "User";
    await supabase.from("coach_ticket_replies").insert({
      ticket_id: activeTicket.id, user_id: user.id, user_name: userName, body: replyText.trim(), is_admin: false,
    } as any);
    setReplyText("");
    setReplySending(false);
    fetchReplies(activeTicket.id);
  };

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === "waiting") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    return <Clock className="h-3 w-3 text-primary" />;
  };

  const pendingTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const answeredTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed" || t.status === "answered");

  const goBack = () => {
    if (view === "detail") { setView("list"); setActiveTicket(null); }
    else setView("menu");
  };

  return (
    <>
      {/* Edge pill button */}
      <button
        onClick={() => { setOpen(true); setView("menu"); }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[55] bg-primary text-primary-foreground px-2 py-3 rounded-l-lg text-xs font-semibold writing-mode-vertical shadow-lg hover:px-2.5 transition-all"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        Coach
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              {view !== "menu" && (
                <button onClick={goBack} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <SheetTitle className="text-base">
                {view === "menu" && "Coach"}
                {view === "ask" && "Ask a Question"}
                {view === "list" && "My Questions"}
                {view === "detail" && (activeTicket?.category || "Question")}
                {view === "answered" && "Answered"}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* ── Menu ── */}
            {view === "menu" && (
              <div className="space-y-2">
                <button
                  onClick={() => setView("ask")}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors text-left"
                >
                  <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ask a Question</p>
                    <p className="text-xs text-muted-foreground">Submit to a coach for review</p>
                  </div>
                </button>
                <button
                  onClick={() => setView("list")}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors text-left"
                >
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">My Questions</p>
                    <p className="text-xs text-muted-foreground">Pending submissions</p>
                  </div>
                </button>
                <button
                  onClick={() => setView("answered")}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-4 hover:border-primary/30 transition-colors text-left"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Answered</p>
                    <p className="text-xs text-muted-foreground">Reviewed by coach</p>
                  </div>
                </button>
              </div>
            )}

            {/* ── Ask form ── */}
            {view === "ask" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Template (optional)</label>
                  <Select value={template} onValueChange={(v) => { setTemplate(v); setQuestion(QUESTION_TEMPLATES[v] || ""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(QUESTION_TEMPLATES).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Urgency</label>
                  <div className="flex gap-2">
                    {["standard", "priority"].map((u) => (
                      <button key={u} onClick={() => setUrgency(u)} className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                        urgency === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}>{u}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Your Question</label>
                  <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={5} placeholder="Be specific. Include context." />
                </div>
                <div className="flex items-center gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                    <Image className="h-3.5 w-3.5" /> Screenshot
                  </Button>
                  {screenshotFile && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{screenshotFile.name}</span>}
                </div>
                <Button onClick={handleSubmit} disabled={!question.trim() || sending} className="w-full gap-2">
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit
                </Button>
              </div>
            )}

            {/* ── List (pending) ── */}
            {view === "list" && (
              <>
                {ticketsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : pendingTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No pending questions.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingTickets.map((t) => (
                      <button key={t.id} onClick={() => { setActiveTicket(t); setView("detail"); }}
                        className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          {statusIcon(t.status)}
                          <span className="text-xs text-muted-foreground">{t.category}</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{t.question}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDateShort(t.created_at)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Answered ── */}
            {view === "answered" && (
              <>
                {ticketsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : answeredTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No answered questions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {answeredTickets.map((t) => (
                      <button key={t.id} onClick={() => { setActiveTicket(t); setView("detail"); }}
                        className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-xs text-muted-foreground">{t.category}</span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{t.question}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDateShort(t.created_at)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Detail ── */}
            {view === "detail" && activeTicket && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Your question</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{activeTicket.question}</p>
                  {activeTicket.screenshot_url && (
                    <img src={activeTicket.screenshot_url} alt="" className="mt-2 rounded-lg max-h-[200px] object-cover" />
                  )}
                </div>

                {repliesLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : replies.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Awaiting coach response.</p>
                ) : (
                  <div className="space-y-3">
                    {replies.map((r) => (
                      <div key={r.id} className={cn("rounded-lg p-3", r.is_admin ? "bg-primary/5 border border-primary/10" : "bg-muted/20")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("text-xs font-medium", r.is_admin ? "text-primary" : "text-foreground")}>
                            {r.is_admin ? "Coach" : r.user_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatDateShort(r.created_at)}</span>
                        </div>
                        <div className="text-sm text-foreground/80 prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown>{r.body}</ReactMarkdown>
                        </div>
                        {r.is_admin && <div className="mt-2"><CopyButton text={r.body} /></div>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply..." rows={2} className="flex-1" />
                  <Button size="sm" onClick={handleReply} disabled={!replyText.trim() || replySending} className="self-end">
                    {replySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
