import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MessageSquare, X, Loader2, Send, ChevronLeft, Image,
  Clock, CheckCircle2, AlertCircle, History, Copy, Check,
  ChevronDown, ChevronUp, Sparkles, Brain, Play, ChevronRight,
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
import { formatDateTime, formatDateShort } from "@/lib/formatTime";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useOSNotifications } from "@/hooks/useOSNotifications";
import { ImageLightbox } from "@/components/academy/community/ImageLightbox";
import { useNavigate } from "react-router-dom";
import supplyZoneImg from "@/assets/supply-zone-example.png";
import demandZoneImg from "@/assets/demand-zone-example.png";
import supplyDemandImg from "@/assets/supply-demand-zones.png";

const CHART_EXAMPLES = [
  { src: supplyZoneImg, alt: "Supply zone example — large body candles pushing away from zone" },
  { src: demandZoneImg, alt: "Demand zone example — price bouncing off demand area" },
  { src: supplyDemandImg, alt: "Supply and demand zones on a real chart" },
];

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

interface InstantAnswer {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: { type: string; image_url: { url: string } }[];
  isStreaming?: boolean;
}

// Parse video recommendations from AI response — resilient to format variations
function parseVideoRecommendations(content: string): VideoRecommendation[] {
  const recs: VideoRecommendation[] = [];
  // Match: optional emoji, optional bold, "Recommended Lesson:", quoted title, "in" module
  const regex = /📺?\s*\*{0,2}Recommended Lesson:?\*{0,2}\s*"([^"]+)"\s*in\s*(.+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    recs.push({ lessonTitle: match[1], moduleTitle: match[2].trim().replace(/\*+$/, "").trim() });
  }
  return recs;
}

// Parse navigation links from AI response — resilient to format variations
const ACADEMY_ROUTES = ["/academy/home", "/academy/learn", "/academy/trade", "/academy/community", "/academy/live", "/academy/vault-os", "/academy/playbook", "/academy/settings", "/academy/journal", "/academy/progress"];

function parseNavigationLinks(content: string): NavigationLink[] {
  const links: NavigationLink[] = [];
  const seen = new Set<string>();

  // Pattern 1: 🔗 **Go to:** Label (/path) — with flexible formatting
  const emojiRegex = /🔗?\s*\*{0,2}Go to:?\*{0,2}\s*(.+?)\s*\(([^)]+)\)/gi;
  let match;
  while ((match = emojiRegex.exec(content)) !== null) {
    const path = match[2].trim();
    if (!seen.has(path)) {
      seen.add(path);
      links.push({ label: match[1].replace(/\*+/g, "").trim(), path });
    }
  }

  // Pattern 2: Standard markdown links [Label](/academy/...) 
  const mdRegex = /\[([^\]]+)\]\((\/academy\/[^)]+)\)/gi;
  while ((match = mdRegex.exec(content)) !== null) {
    const path = match[2].trim();
    if (!seen.has(path) && ACADEMY_ROUTES.some(r => path.startsWith(r))) {
      seen.add(path);
      links.push({ label: match[1].trim(), path });
    }
  }

  return links;
}

function NavLinkCard({ link, onClick }: { link: NavigationLink; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] to-emerald-500/[0.02] p-3 hover:border-emerald-500/40 hover:from-emerald-500/[0.10] hover:to-emerald-500/[0.04] transition-all duration-200 text-left"
    >
      <div className="shrink-0 h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
        <ChevronRight className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{link.label}</p>
        <p className="text-xs text-muted-foreground truncate">{link.path}</p>
      </div>
      <span className="shrink-0 text-[11px] font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Open →
      </span>
    </button>
  );
}

function VideoCard({ rec, onClick }: { rec: VideoRecommendation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] p-3 hover:border-primary/40 hover:from-primary/[0.10] hover:to-primary/[0.04] transition-all duration-200 text-left"
    >
      <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
        <Play className="h-4 w-4 text-primary fill-primary/30" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{rec.lessonTitle}</p>
        <p className="text-xs text-muted-foreground truncate">{rec.moduleTitle}</p>
      </div>
      <span className="shrink-0 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Watch →
      </span>
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const { copyToClipboard } = await import("@/lib/copyToClipboard");
    await copyToClipboard(text);
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="vault-ai-dot h-1.5 w-1.5 rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
      <span className="vault-ai-dot h-1.5 w-1.5 rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
      <span className="vault-ai-dot h-1.5 w-1.5 rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

type Tab = "instant" | "coach";
type CoachView = "new" | "list" | "detail";

export function CoachDrawer() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { requestIfNeeded: requestOSPermission } = useOSNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("instant");

  // Ref to always hold the latest handleChatSend
  const handleChatSendRef = useRef<(text?: string) => Promise<void>>(async () => {});

  // ── Start a truly fresh conversation ──
  const startNewConversation = useCallback(() => {
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setShowHistory(false);
  }, []);

  // Listen for sidebar toggle event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const incomingQuestion = detail?.question as string | undefined;

      if (incomingQuestion) {
        // Fresh thread + send question
        startNewConversation();
        setTab("instant");
        setOpen(true);
        // Use ref so we always call the latest version after state clears
        setTimeout(() => handleChatSendRef.current(incomingQuestion), 100);
      } else {
        if (detail?.tab === "coach") setTab("coach");
        else if (detail?.tab === "instant") setTab("instant");
        setOpen((prev) => {
          const willOpen = !prev;
          // Reset to fresh chat when opening (not when closing)
          if (willOpen) startNewConversation();
          return willOpen;
        });
      }
    };
    window.addEventListener("toggle-coach-drawer", handler);
    return () => window.removeEventListener("toggle-coach-drawer", handler);
  }, [startNewConversation]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Coach state
  const [coachView, setCoachView] = useState<CoachView>("new");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [urgency, setUrgency] = useState("standard");
  const [question, setQuestion] = useState("");
  const [template, setTemplate] = useState("None");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  const [showHistory, setShowHistory] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pastAnswers, setPastAnswers] = useState<InstantAnswer[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Check if user has trades for dynamic chips
  const [hasTrades, setHasTrades] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("trade_entries" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id).limit(1)
      .then(({ count }) => setHasTrades((count || 0) > 0));
  }, [user]);

  const starterChips = useMemo(() => {
    if (hasTrades) {
      return [
        "How did my last trade go?",
        "Am I following my rules?",
        "What should I study next?",
        "How do I size my trades?",
      ];
    }
    return [
      "What is a stop loss?",
      "How do I size my trades?",
      "Explain options like I'm 10",
      "What should I study next?",
    ];
  }, [hasTrades]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

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
    if (showHistory) fetchPastAnswers();
  }, [showHistory, fetchPastAnswers]);

  if (!user) return null;

  const handleVideoClick = (rec: VideoRecommendation) => {
    setOpen(false);
    navigate(`/academy/learn/${rec.moduleSlug || rec.moduleTitle.toLowerCase().replace(/\s+/g, "-")}`);
  };

  // ── Chat send (streaming) ──
  const handleChatSend = async (overrideText?: string) => {
    const text = overrideText || chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages([...allMessages, { role: "assistant", content: "", isStreaming: true }]);
    setChatLoading(true);

    let assistantSoFar = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setChatMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantSoFar,
                  isStreaming: true,
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) assistantSoFar += content;
          } catch { /* ignore */ }
        }
      }

      // Finalize message
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: assistantSoFar || "I couldn't generate a response. Try asking again.",
          isStreaming: false,
        };
        return updated;
      });

      // Save to instant_answers for history
      if (assistantSoFar) {
        await supabase.from("instant_answers").insert({
          user_id: user.id,
          question: text,
          answer: assistantSoFar,
        } as any);
      }

      // Auto-insert static chart examples if AI mentions the trigger phrase
      // AND the conversation actually discussed supply/demand topics
      const lowerReply = assistantSoFar.toLowerCase();
      const chartTriggerPhrases = ["real chart examples", "show you what that looks like", "chart examples to show"];
      const shouldShowCharts = chartTriggerPhrases.some((p) => lowerReply.includes(p));
      if (shouldShowCharts) {
        // Verify the conversation context is actually about supply/demand/zones
        const recentContext = allMessages.slice(-4).map(m => m.content.toLowerCase()).join(" ") + " " + lowerReply;
        const topicKeywords = ["supply", "demand", "zone", "imbalance", "order block", "fvg", "fair value"];
        const topicMatch = topicKeywords.some(k => recentContext.includes(k));
        if (topicMatch) {
          setTimeout(() => {
            setChatMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "",
                images: CHART_EXAMPLES.map((c) => ({ type: "image_url", image_url: { url: c.src } })),
                isStreaming: false,
              },
            ]);
          }, 400);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to get response", variant: "destructive" });
      setChatMessages((prev) => prev.slice(0, -1));
    }

    setChatLoading(false);
    requestOSPermission();
  };

  // Keep ref in sync so the event listener always calls latest version
  handleChatSendRef.current = handleChatSend;

  // ── Coach handoff ──
  const handleHandoffToCoach = () => {
    const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === "user");
    const lastAiMsg = [...chatMessages].reverse().find((m) => m.role === "assistant");
    let prefill = "";
    if (lastUserMsg && lastAiMsg) {
      const excerpt = lastAiMsg.content.length > 200
        ? lastAiMsg.content.slice(0, 200).trim() + "…"
        : lastAiMsg.content;
      prefill = `What I asked:\n${lastUserMsg.content}\n\nWhat the AI said:\n${excerpt}\n\nWhat I still need help with:\n`;
    }
    setQuestion(prefill);
    setTab("coach");
    setCoachView("new");
  };

  // ── Coach submit ──
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
      requestOSPermission();
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

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === "waiting") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    return <Clock className="h-3 w-3 text-blue-400" />;
  };

  if (!open) return null;

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Trader";

  return (
    <div className="fixed inset-0 z-[60] flex items-start md:items-center justify-center p-3 pt-5 pb-[calc(4.75rem+env(safe-area-inset-bottom,20px))] md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-[min(860px,100%)] rounded-2xl border border-white/[0.10] bg-[linear-gradient(180deg,#0E1218_0%,#0A0E14_100%)] shadow-[0_12px_60px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] animate-in slide-in-from-bottom-4 duration-200 max-h-full md:max-h-[85vh] flex flex-col overflow-hidden">

        {/* ── Premium Vault AI Header ── */}
        <div className="px-6 pt-5 pb-3 shrink-0 relative">
          {/* Animated glow line */}
          <div className="absolute bottom-0 left-6 right-6 h-px vault-ai-header-glow" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center vault-ai-brain-pulse">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#0E1218]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Vault AI
                  <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Coach
                  </span>
                </h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">Your personal trading mentor</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Segmented tabs ── */}
        <div className="flex shrink-0 mx-6 rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5">
          <button
            onClick={() => { setTab("instant"); setShowHistory(false); }}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5",
              tab === "instant"
                ? "bg-white/[0.08] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Brain className="h-3.5 w-3.5" style={{ color: tab === "instant" ? "hsl(var(--primary))" : undefined }} />
            AI Coach
            <span className="text-[10px] font-normal text-muted-foreground/60 hidden sm:inline ml-0.5">Instant</span>
          </button>
          <button
            onClick={() => { setTab("coach"); setCoachView("new"); }}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5",
              tab === "coach"
                ? "bg-white/[0.08] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Coach
            <span className="text-[10px] font-normal text-muted-foreground/60 hidden sm:inline ml-0.5">Human</span>
          </button>
        </div>

        {/* ── Sub-header for coach tab ── */}
        {tab === "coach" && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              {coachView !== "new" && (
                <button onClick={() => { setCoachView(coachView === "detail" ? "list" : "new"); setActiveTicket(null); }} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h3 className="font-semibold text-foreground text-base">
                {coachView === "new" ? "New Question" : coachView === "list" ? "My Questions" : activeTicket?.category}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {coachView === "new" && (
                <button onClick={() => setCoachView("list")} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-white/[0.06]" title="My Questions">
                  <History className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Sub-header for instant tab ── */}
        {tab === "instant" && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              {showHistory && (
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h3 className="font-semibold text-foreground text-base">
                {showHistory ? "Past Conversations" : "AI Trading Coach"}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {!showHistory && (
                <>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-white/[0.06]"
                    title="Past Answers"
                  >
                    <History className="h-4 w-4" />
                  </button>
                   {chatMessages.length > 0 && (
                    <button
                      onClick={startNewConversation}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-white/[0.06] text-xs font-medium"
                      title="New Chat"
                    >
                      New Chat
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* ========== INSTANT / AI CHAT TAB ========== */}
          {tab === "instant" && !showHistory && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {chatMessages.length === 0 ? (
                  /* Premium empty state */
                  <div className="flex flex-col items-center justify-center h-full py-12 space-y-6">
                    <div className="text-center space-y-3">
                      <div className="relative h-16 w-16 mx-auto">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 vault-ai-brain-pulse" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Brain className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-base font-semibold text-foreground">
                        Hey {displayName} — what are you working on?
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        I know your curriculum, your trades, and your rules. Ask me anything about trading — I'll keep it simple.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md">
                       {starterChips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => { startNewConversation(); setTimeout(() => handleChatSendRef.current(chip), 50); }}
                          className="text-sm px-4 py-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] text-muted-foreground hover:text-foreground hover:bg-primary/[0.08] hover:border-primary/25 transition-all duration-150"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Message bubbles */
                  chatMessages.map((msg, i) => {
                    const videoRecs = msg.role === "assistant" && !msg.isStreaming
                      ? parseVideoRecommendations(msg.content)
                      : [];
                    const navLinks = msg.role === "assistant" && !msg.isStreaming
                      ? parseNavigationLinks(msg.content)
                      : [];
                    // Strip video lines and nav link lines from displayed content
                    const displayContent = msg.role === "assistant"
                      ? msg.content
                          .replace(/(?:📺\s*)?\*\*Recommended Lesson:\*\*\s*"[^"]+"\s*in\s*.+/g, "")
                          .replace(/🔗\s*\*\*Go to:\*\*\s*.+?\([^)]+\)/g, "")
                          .trim()
                      : msg.content;

                    return (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "rounded-2xl px-4 py-3 max-w-[85%] space-y-2",
                          msg.role === "user"
                            ? "rounded-tr-sm bg-primary/15 border border-primary/20"
                            : "rounded-tl-sm bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                        )}>
                          {msg.role === "assistant" ? (
                            <>
                              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground/90 leading-relaxed [&_strong]:text-foreground [&_li]:text-foreground/90 [&_p]:mb-2 [&_ul]:mb-2">
                                {!displayContent && msg.isStreaming ? (
                                  <TypingDots />
                                ) : (
                                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                                )}
                                {msg.isStreaming && displayContent && (
                                  <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" />
                                )}
                              </div>
                              {/* Video recommendation cards */}
                              {videoRecs.length > 0 && (
                                <div className="pt-2 space-y-2">
                                  {videoRecs.map((rec, idx) => (
                                    <VideoCard key={idx} rec={rec} onClick={() => handleVideoClick(rec)} />
                                  ))}
                                </div>
                              )}
                              {/* Navigation link cards */}
                              {navLinks.length > 0 && (
                                <div className="pt-2 space-y-2">
                                  {navLinks.map((link, idx) => (
                                    <NavLinkCard key={idx} link={link} onClick={() => { navigate(link.path); setOpen(false); }} />
                                  ))}
                                </div>
                              )}
                              {msg.images && msg.images.length > 0 && (
                                <div className="pt-2 space-y-2">
                                  {msg.images.map((img, idx) => (
                                    <div key={idx} className="relative rounded-lg overflow-hidden border border-white/[0.08] bg-black/20">
                                      <img
                                        src={img.image_url.url}
                                        alt="AI generated educational diagram"
                                        className="w-full max-h-[45vh] sm:max-h-[40vh] md:max-h-[38vh] object-contain cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                                        onClick={() => setLightboxSrc(img.image_url.url)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Actions row */}
                              {!msg.isStreaming && displayContent && (
                                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                                  <CopyButton text={msg.content} />
                                  <span className="text-[10px] text-muted-foreground/40">Education only</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Coach handoff after AI messages */}
                {chatMessages.length > 1 && !chatLoading && chatMessages[chatMessages.length - 1]?.role === "assistant" && !chatMessages[chatMessages.length - 1]?.isStreaming && (
                  <div className="flex justify-start">
                    <button
                      onClick={handleHandoffToCoach}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Still stuck? Ask Coach RZ (human)
                    </button>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* ── Composer (bottom-pinned) ── */}
              <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,12px))]" style={{ background: 'linear-gradient(180deg, #0E1218 0%, #0A0E14 100%)' }}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSend();
                      }
                    }}
                    placeholder="Ask about trading, your trades, or what to study..."
                    className="flex-1 resize-none text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 min-h-[40px] max-h-[120px]"
                    rows={1}
                    maxLength={1000}
                    disabled={chatLoading}
                  />

                  <button
                    onClick={() => handleChatSend()}
                    disabled={!chatInput.trim() || chatLoading}
                    className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-b from-primary to-primary/80 text-primary-foreground hover:shadow-[0_0_16px_2px_hsl(217_91%_60%/0.2)] disabled:opacity-40 disabled:pointer-events-none transition-all duration-150 active:scale-95"
                  >
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Past answers history ── */}
          {tab === "instant" && showHistory && (
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              {pastLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : pastAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No past answers yet.</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-sm" onClick={() => setShowHistory(false)}>Start chatting</Button>
                </div>
              ) : pastAnswers.map((a) => (
                <div key={a.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
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

          {/* ========== COACH TAB ========== */}
          {tab === "coach" && coachView === "new" && (
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <p className="text-[13px] text-muted-foreground">
                Standard: usually within 1–2 hours
              </p>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-foreground/80">Your Question</label>
                <p className="text-[12px] text-muted-foreground">Keep it simple: what you tried + what happened + what you want.</p>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe the situation, what you tried, and where you're stuck…"
                  className="resize-none text-base min-h-[140px] leading-[1.5] py-3.5 px-4 bg-white/[0.03] border-white/[0.08]"
                  rows={6}
                  maxLength={1000}
                />
              </div>

              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} />
                {screenshotFile ? (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1">{screenshotFile.name}</span>
                    <button onClick={() => setScreenshotFile(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="gap-2 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]" onClick={() => fileRef.current?.click()}>
                    <span>📎</span> Attach Screenshot
                  </Button>
                )}
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAdvanced ? "Hide options" : "Show more options"}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80">Category</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-foreground/80">Question Template</label>
                    <Select value={template} onValueChange={(val) => { setTemplate(val); if (val !== "None") setQuestion(QUESTION_TEMPLATES[val]); }}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-[70]">
                        {Object.keys(QUESTION_TEMPLATES).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[12px] text-muted-foreground">Optional — pick a template to get started faster</p>
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 pt-3 pb-1 -mx-6 px-6 border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0E1218 0%, #0A0E14 100%)' }}>
                <Button onClick={handleSubmit} disabled={!question.trim() || sending} className="w-full gap-2 h-12 text-base font-semibold">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Submitting…" : "Send to Coach"}
                </Button>
                <p className="text-[11px] text-muted-foreground/60 text-center mt-2">Human response • usually within 2–4 hours</p>
              </div>
            </div>
          )}

          {tab === "coach" && coachView === "list" && (
            <div className="px-6 py-5 space-y-3 overflow-y-auto">
              {ticketsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No questions yet.</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-sm" onClick={() => setCoachView("new")}>Ask your first question</Button>
                </div>
              ) : tickets.map((t) => (
                <button key={t.id} onClick={() => { setActiveTicket(t); setCoachView("detail"); }} className="w-full text-left rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{statusIcon(t.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider bg-white/[0.06] px-2 py-0.5 rounded text-muted-foreground">{t.category}</span>
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
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {statusIcon(activeTicket.status)}
                  <span className="text-sm font-medium capitalize">{activeTicket.status}</span>
                  <span className="text-xs text-muted-foreground/50">{formatDateTime(activeTicket.created_at)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{activeTicket.question}</p>
                {activeTicket.screenshot_url && (
                  <a href={activeTicket.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img src={activeTicket.screenshot_url} alt="Screenshot" className="rounded-lg border border-white/[0.08] max-h-40 object-cover" />
                  </a>
                )}
              </div>
              <div className="border-t border-white/[0.06] pt-3 space-y-3">
                {repliesLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No replies yet. A coach will respond soon.</p>
                ) : replies.map((r) => (
                  <div key={r.id} className={cn("rounded-lg p-4 text-sm", r.is_admin ? "bg-primary/5 border border-primary/10" : "bg-white/[0.04]")}>
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
                <div className="sticky bottom-0 pt-3 pb-1 -mx-6 px-6 border-t border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #0E1218 0%, #0A0E14 100%)' }}>
                  <div className="flex gap-2">
                    <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Add a reply…" className="flex-1 h-10 text-sm bg-white/[0.03] border-white/[0.08]" maxLength={500}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }} />
                    <Button size="icon" className="h-10 w-10" onClick={handleReply} disabled={!replyText.trim() || replySending}>
                      {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="AI generated chart"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
}
