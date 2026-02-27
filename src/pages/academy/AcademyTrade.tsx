import { useState, useEffect } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, PenLine, MessageSquare, BarChart3, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";

// Reuse Journal + Progress inline
import AcademyJournalContent from "@/pages/academy/AcademyJournalContent";
import AcademyProgressContent from "@/pages/academy/AcademyProgressContent";

const SETUP_TYPES = [
  "Breakout",
  "Pullback",
  "Reversal",
  "Momentum",
  "Scalp",
  "Swing",
  "Other",
];

const AcademyTrade = () => {
  const [tab, setTab] = useState("post");

  return (
    <AcademyLayout>
      <PageHeader title="Trade" subtitle="Post, journal, and review your trades" />
      <div className="px-4 md:px-6 pb-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-4 max-w-3xl">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto flex-wrap">
            <TabsTrigger value="post" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Post a Trade
            </TabsTrigger>
            <TabsTrigger value="journal" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <PenLine className="h-3.5 w-3.5" />
              My Journal
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Coach Feedback
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Weekly Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="post">
            <PostTradeForm />
          </TabsContent>

          <TabsContent value="journal">
            <AcademyJournalContent />
          </TabsContent>

          <TabsContent value="feedback">
            <CoachFeedbackQueue />
          </TabsContent>

          <TabsContent value="review">
            <AcademyProgressContent />
          </TabsContent>
        </Tabs>
      </div>
    </AcademyLayout>
  );
};

function PostTradeForm() {
  const { user, profile } = useAuth();
  const [ticker, setTicker] = useState("");
  const [setupType, setSetupType] = useState("");
  const [entryExit, setEntryExit] = useState("");
  const [risk, setRisk] = useState("");
  const [thesis, setThesis] = useState("");
  const [requestCoach, setRequestCoach] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = ticker.trim() && setupType && entryExit.trim() && risk.trim() && thesis.trim();

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSending(true);

    const userName = profile?.display_name || user.email?.split("@")[0] || "Trader";
    const formattedBody = `**${ticker.toUpperCase()}** — ${setupType}\nEntry/Exit: ${entryExit}\nRisk: ${risk}\nThesis: ${thesis}`;

    // 1) Create journal entry
    const { error: journalErr } = await supabase.from("journal_entries").insert({
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      what_happened: `${setupType} — Entry/Exit: ${entryExit}, Risk: ${risk}`,
      biggest_mistake: "none",
      lesson: thesis,
      followed_rules: true,
    });

    if (journalErr) {
      toast.error("Failed to create journal entry");
      setSending(false);
      return;
    }

    // 2) Post to Community Trade Floor
    const { error: msgError } = await supabase.from("academy_messages").insert({
      room_slug: "trade-recaps",
      user_id: user.id,
      user_name: userName,
      body: formattedBody,
    });

    if (msgError) {
      toast.error("Failed to post to Trade Floor");
      setSending(false);
      return;
    }

    // 3) Optionally request coach feedback
    if (requestCoach) {
      await supabase.from("coach_tickets").insert({
        user_id: user.id,
        category: "Trade Review",
        urgency: "standard",
        question: `Trade Recap: ${ticker.toUpperCase()} — ${setupType}\nEntry/Exit: ${entryExit}\nRisk: ${risk}\nThesis: ${thesis}`,
      });
    }

    setSending(false);
    toast.success(
      requestCoach
        ? "Trade posted to Trade Floor, journaled, and sent to Coach"
        : "Trade posted to Trade Floor and journaled"
    );
    setSent(true);
  };

  const handleReset = () => {
    setTicker(""); setSetupType(""); setEntryExit(""); setRisk(""); setThesis(""); setRequestCoach(false); setSent(false);
  };

  if (sent) {
    return (
      <Card className="p-6 max-w-lg space-y-4 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Trade Posted</h3>
          <p className="text-xs text-muted-foreground mt-1">Logged in your journal and visible on Trade Floor.{requestCoach ? " Sent to Coach for review." : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>Post Another</Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Ticker</Label>
        <Input placeholder="e.g. SPY, AAPL, ES" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="uppercase" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Setup Type</Label>
        <Select value={setupType} onValueChange={setSetupType}>
          <SelectTrigger><SelectValue placeholder="Select setup" /></SelectTrigger>
          <SelectContent>
            {SETUP_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Entry / Exit</Label>
        <Input placeholder="e.g. Entry $450, Exit $455" value={entryExit} onChange={(e) => setEntryExit(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Risk ($ or %)</Label>
        <Input placeholder="e.g. $200 or 1%" value={risk} onChange={(e) => setRisk(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Thesis (1 sentence)</Label>
        <Textarea placeholder="Why did you take this trade?" value={thesis} onChange={(e) => setThesis(e.target.value)} rows={2} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Checkbox id="coach-feedback" checked={requestCoach} onCheckedChange={(v) => setRequestCoach(v === true)} />
        <Label htmlFor="coach-feedback" className="text-xs text-muted-foreground cursor-pointer">Request Coach Feedback</Label>
      </div>
      <Button onClick={handleSubmit} disabled={!canSubmit || sending} className="w-full gap-2">
        {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Post Trade
      </Button>
    </Card>
  );
}

function CoachFeedbackQueue() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coach_tickets")
      .select("id, question, status, created_at, category")
      .eq("user_id", user.id)
      .eq("category", "Trade Review")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTickets(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (tickets.length === 0) {
    return (
      <Card className="p-6 text-center max-w-lg">
        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No trades submitted for review yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Post a trade to get coach feedback.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2 max-w-lg">
      {tickets.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground line-clamp-1">{t.question}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.status === "answered" || t.status === "closed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {t.status === "answered" || t.status === "closed" ? "Reviewed" : "Pending"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {new Date(t.created_at).toLocaleDateString()}
          </p>
        </Card>
      ))}
    </div>
  );
}

export default AcademyTrade;
