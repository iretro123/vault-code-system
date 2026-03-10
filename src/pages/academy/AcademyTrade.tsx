import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Minus, Brain, BarChart3, Wallet, CalendarCheck, Eye, CheckCircle2, AlertTriangle, RotateCcw, Download, ChevronDown, ChevronUp, Lock, RefreshCw, Crosshair, Zap, Shield, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { LogTradeSheet, type TradeFormData } from "@/components/academy/LogTradeSheet";
import { SetStartingBalanceModal } from "@/components/academy/SetStartingBalanceModal";
import { QuickCheckInSheet } from "@/components/academy/QuickCheckInSheet";
import { NoTradeDaySheet } from "@/components/academy/NoTradeDaySheet";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
type TodayStatus = "incomplete" | "in_progress" | "complete";

const OUTCOME_STYLES = {
  win: { label: "Win", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  loss: { label: "Loss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  breakeven: { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

/* ── Page ── */
const AcademyTrade = () => {
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { user } = useAuth();
  const { entries, loading: tradesLoading, addEntry, exportCSV, refetch: refetchTrades } = useTradeLog();

  // Balance state — loaded from DB
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // Reset gate
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);

  // UI state
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>("incomplete");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNoTradeDay, setShowNoTradeDay] = useState(false);
  const [noTradeDay, setNoTradeDay] = useState(false);

  // Weekly balance check
  const [brokerBalance, setBrokerBalance] = useState("");
  const [balanceSaved, setBalanceSaved] = useState(false);
  const [balanceCheckDismissed, setBalanceCheckDismissed] = useState(false);

  // Load balance from profiles on mount
  useEffect(() => {
    if (!user) {
      setBalanceLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("account_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data && data.account_balance > 0) {
          setStartingBalance(data.account_balance);
        } else {
          // No balance set — show modal
          setShowBalanceModal(true);
        }
      } catch (e) {
        console.error("Error loading balance:", e);
        setShowBalanceModal(true);
      } finally {
        setBalanceLoading(false);
      }
    })();
  }, [user]);

  // Derived metrics from DB entries
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTradeCount = useMemo(
    () => entries.filter((e) => e.trade_date === todayStr).length,
    [entries, todayStr]
  );

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekEntries = useMemo(
    () => entries.filter((e) => new Date(e.trade_date) >= startOfWeek),
    [entries, startOfWeek]
  );

  const trackedBalance = useMemo(() => {
    if (startingBalance === null) return null;
    const totalPnl = entries.reduce((sum, e) => {
      const pnl = e.risk_reward * e.risk_used * (e.followed_rules ? 1 : -1);
      return sum + pnl;
    }, 0);
    return startingBalance + totalPnl;
  }, [startingBalance, entries]);

  const weeklyWinRate = useMemo(() => {
    if (weekEntries.length === 0) return "--";
    const wins = weekEntries.filter((e) => e.risk_reward > 0).length;
    return `${Math.round((wins / weekEntries.length) * 100)}%`;
  }, [weekEntries]);

  const weeklyPnl = useMemo(() => {
    if (weekEntries.length === 0) return "--";
    const total = weekEntries.reduce((s, e) => s + e.risk_reward * e.risk_used * (e.followed_rules ? 1 : -1), 0);
    return total >= 0 ? `+$${total.toFixed(0)}` : `-$${Math.abs(total).toFixed(0)}`;
  }, [weekEntries]);

  const hasData = entries.length > 0;

  /* ── Handlers ── */
  const handleStartingBalanceSave = async (balance: number) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_balance: balance })
        .eq("user_id", user.id);
      if (error) throw error;
      setStartingBalance(balance);
      setShowBalanceModal(false);
      setBalanceSkipped(false);
      toast({ title: "Starting balance set", description: `Tracking from $${balance.toLocaleString()}.` });
    } catch (e) {
      console.error("Error saving balance:", e);
      toast({ title: "Error saving balance", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleBalanceDismiss = () => {
    setShowBalanceModal(false);
    setBalanceSkipped(true);
  };

  const handleResetBalance = async () => {
    if (resetInput !== "RESET" || !user) return;
    setResetting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_balance: 0 })
        .eq("user_id", user.id);
      if (error) throw error;
      setStartingBalance(null);
      setShowResetConfirm(false);
      setResetInput("");
      setShowBalanceModal(true);
      toast({ title: "Balance reset", description: "Set a new starting balance to continue tracking." });
    } catch (e) {
      console.error("Error resetting balance:", e);
      toast({ title: "Error resetting balance", description: "Please try again.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleTradeSubmit = async (data: TradeFormData) => {
    const pnlNum = parseFloat(data.pnl) || 0;
    const isWin = data.resultType === "Win";
    const isLoss = data.resultType === "Loss";

    const newEntry = {
      risk_used: Math.abs(pnlNum),
      risk_reward: isWin ? 1 : isLoss ? -1 : 0,
      followed_rules: data.planFollowed === "Yes",
      emotional_state: 5,
      notes: `${data.symbol} ${data.direction} | Setup: ${data.setupUsed || "—"} | Target: ${data.targetHit} | Stop: ${data.stopRespected} | Oversized: ${data.oversized}${data.note ? " | " + data.note : ""}`,
      symbol: data.symbol.toUpperCase(),
      outcome: isWin ? "WIN" : isLoss ? "LOSS" : "BREAKEVEN",
      trade_date: format(data.date, "yyyy-MM-dd"),
    };

    const { error } = await addEntry(newEntry);
    if (error) {
      // Don't close sheet — form stays filled for retry
      throw error;
    }
    // Update the profile balance with the new P/L
    if (startingBalance !== null && user) {
      const newBalance = (trackedBalance ?? startingBalance) + (isWin ? Math.abs(pnlNum) : isLoss ? -Math.abs(pnlNum) : 0);
      await supabase.from("profiles").update({ account_balance: newBalance }).eq("user_id", user.id);
    }
    setShowLogTrade(false);
    setTodayStatus("in_progress");
    setTimeout(() => setShowCheckIn(true), 400);
  };

  const handleCheckInComplete = () => {
    setShowCheckIn(false);
    setTodayStatus("complete");
    toast({ title: "Check-in complete", description: "AI review is ready for this session." });
  };

  const handleNoTradeDayComplete = () => {
    setShowNoTradeDay(false);
    setNoTradeDay(true);
    setTodayStatus("complete");
    toast({ title: "No-trade day logged", description: "Consistency tracked. Smart rest is part of the edge." });
  };

  const handleBalanceSave = async () => {
    const val = parseFloat(brokerBalance);
    if (!val || val <= 0 || !user) return;
    try {
      await supabase.from("profiles").update({ account_balance: val }).eq("user_id", user.id);
      setBalanceSaved(true);
      setStartingBalance(val);
      toast({ title: "Balance updated", description: "Vault is now aligned with your account for this week." });
    } catch {
      toast({ title: "Error updating balance", variant: "destructive" });
    }
  };

  if (!hasAccess && !accessLoading) {
    return <PremiumGate status={status} pageName="My Trades" />;
  }

  if (balanceLoading || tradesLoading) {
    return (
      <>
        <PageHeader title="My Trades" subtitle="Loading your trade data..." />
        <div className="px-4 md:px-6 pb-10 max-w-3xl">
          <div className="vault-glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Trades"
        subtitle="Log trades, track performance, and improve execution with AI review."
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setShowLogTrade(true)}>
            <Plus className="h-3.5 w-3.5" /> Log Trade
          </Button>
        }
      />
      <div className="px-4 md:px-6 pb-10 space-y-5 max-w-3xl">

        {/* Inline reminder when balance was skipped */}
        {balanceSkipped && startingBalance === null && (
          <div className="vault-glass-card p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">Starting balance not set</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your stats won't track accurately until you set your starting balance.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setShowBalanceModal(true)}
            >
              Set Balance Now
            </Button>
          </div>
        )}

        {/* Getting Started Banner — new users with no trades */}
        {!hasData && (
          <GettingStartedBanner
            balanceSet={startingBalance !== null}
            onSetBalance={() => setShowBalanceModal(true)}
            todayStatus={todayStatus}
          />
        )}

        <TodayTradeCheckCard
          count={todayTradeCount}
          status={todayStatus}
          noTradeDay={noTradeDay}
          onLogTrade={() => setShowLogTrade(true)}
          onNoTradeDay={() => setShowNoTradeDay(true)}
          onCompleteCheckIn={() => setShowCheckIn(true)}
          onReviewFeedback={() => document.getElementById("ai-focus-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />
        <WeeklyProgressCard
          tradesLogged={weekEntries.length}
          winRate={weeklyWinRate}
          pnl={weeklyPnl}
          hasData={hasData}
        />
        <TrackedBalanceCard
          balance={trackedBalance}
          showResetConfirm={showResetConfirm}
          resetInput={resetInput}
          resetting={resetting}
          onToggleReset={() => { setShowResetConfirm(!showResetConfirm); setResetInput(""); }}
          onResetInputChange={setResetInput}
          onConfirmReset={handleResetBalance}
        />
        <AIFocusCard hasData={hasData} />
        <RecentTradesSection entries={entries} onExportCSV={exportCSV} />
        <WeeklyReviewCard hasData={hasData} />
        {!balanceCheckDismissed && hasData && (
          <WeeklyBalanceCheckCard
            value={brokerBalance}
            onChange={setBrokerBalance}
            onSave={handleBalanceSave}
            onSkip={() => setBalanceCheckDismissed(true)}
            saved={balanceSaved}
          />
        )}
      </div>

      {/* Modals/Sheets */}
      <SetStartingBalanceModal
        open={showBalanceModal && startingBalance === null}
        onSave={handleStartingBalanceSave}
        onDismiss={handleBalanceDismiss}
      />
      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} />
      <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} />
      <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} />
    </>
  );
};

/* ── Getting Started Banner ── */
function GettingStartedBanner({
  balanceSet,
  onSetBalance,
  todayStatus,
}: {
  balanceSet: boolean;
  onSetBalance: () => void;
  todayStatus: TodayStatus;
}) {
  const steps = [
    {
      num: 1,
      title: "Set your starting balance",
      desc: "Tell us your current account balance so we can track your progress.",
      done: balanceSet,
      active: !balanceSet,
    },
    {
      num: 2,
      title: "Log your first trade",
      desc: "After your next trade, tap the + Log Trade button above.",
      done: todayStatus !== "incomplete",
      active: balanceSet && todayStatus === "incomplete",
    },
    {
      num: 3,
      title: "Complete your check-in",
      desc: "After logging, you'll answer 3 quick questions. Takes 30 seconds.",
      done: todayStatus === "complete",
      active: todayStatus === "in_progress",
    },
  ];

  return (
    <div className="vault-glass-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Get Started with My Trades</h3>
        <p className="text-sm text-muted-foreground mt-1">Follow these three steps to begin tracking your trading performance.</p>
      </div>
      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.num} className={`flex items-start gap-4 ${!s.active && !s.done ? "opacity-40" : ""}`}>
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                s.done
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : s.active
                  ? "bg-primary/20 border-primary/50 text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                  : "bg-white/5 border-white/10 text-muted-foreground"
              }`}
            >
              {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-semibold text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              {s.num === 1 && s.active && (
                <Button size="sm" className="mt-2 gap-1.5" onClick={onSetBalance}>
                  <Wallet className="h-3.5 w-3.5" /> Set Starting Balance
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 1. Today's Trade Check ── */
function TodayTradeCheckCard({
  count, status, noTradeDay, onLogTrade, onNoTradeDay, onCompleteCheckIn, onReviewFeedback,
}: {
  count: number; status: TodayStatus; noTradeDay: boolean;
  onLogTrade: () => void; onNoTradeDay: () => void; onCompleteCheckIn: () => void; onReviewFeedback: () => void;
}) {
  const badgeMap = {
    incomplete: { text: "Incomplete", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    in_progress: { text: "In progress", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    complete: { text: "Complete", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const badge = badgeMap[status];

  return (
    <div className="vault-glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Today's Trade Check</h3>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <StatMini label="Status" value={badge.text} />
        <StatMini label="Trades logged" value={noTradeDay ? "No-trade day" : String(count)} />
        <StatMini label="Check-in" value={status === "complete" ? "Done" : status === "in_progress" ? "Pending" : "Not started"} />
        <StatMini label="AI review" value={status === "complete" ? "Ready" : "Waiting"} />
      </div>

      {status === "incomplete" && (
        <>
          <p className="text-xs text-muted-foreground">Complete today's trade check to keep your progress tracking accurate.</p>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={onLogTrade}><Plus className="h-3.5 w-3.5" /> Log today's trade</Button>
            <Button size="sm" variant="outline" onClick={onNoTradeDay}>Mark no-trade day</Button>
          </div>
        </>
      )}
      {status === "in_progress" && (
        <>
          <p className="text-xs text-muted-foreground">Trade logged. Complete your check-in to finish today's accountability.</p>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={onCompleteCheckIn}><CheckCircle2 className="h-3.5 w-3.5" /> Complete check-in</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onLogTrade}><Plus className="h-3.5 w-3.5" /> Log another trade</Button>
          </div>
        </>
      )}
      {status === "complete" && (
        <>
          <p className="text-xs text-emerald-400/80">{noTradeDay ? "No-trade day tracked. Consistency maintained." : "Today's accountability is complete. Review your feedback below."}</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onReviewFeedback}><Eye className="h-3.5 w-3.5" /> Review today's feedback</Button>
        </>
      )}
    </div>
  );
}

/* ── 2. Weekly Progress ── */
function WeeklyProgressCard({ tradesLogged, winRate, pnl, hasData }: { tradesLogged: number; winRate: string; pnl: string; hasData: boolean }) {
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Weekly Progress</h3>
      <div className="grid grid-cols-2 gap-4">
        <StatBlock label="Trades Logged" value={String(tradesLogged)} />
        <StatBlock label="Win Rate" value={winRate} />
        <StatBlock label="P/L" value={pnl} />
        <StatBlock label="Plan Follow Rate" value="--" />
      </div>
      <p className="text-xs text-muted-foreground">
        {hasData ? "Updated automatically when you log trades." : "Log your first trade to see stats here."}
      </p>
    </div>
  );
}

/* ── 3. Tracked Balance with RESET gate ── */
function TrackedBalanceCard({
  balance,
  showResetConfirm,
  resetInput,
  resetting,
  onToggleReset,
  onResetInputChange,
  onConfirmReset,
}: {
  balance: number | null;
  showResetConfirm: boolean;
  resetInput: string;
  resetting: boolean;
  onToggleReset: () => void;
  onResetInputChange: (v: string) => void;
  onConfirmReset: () => void;
}) {
  if (balance === null) {
    return (
      <div className="vault-glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tracked Balance</h3>
        </div>
        <p className="text-sm text-muted-foreground">Set your starting balance to begin tracking.</p>
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Tracked Balance</h3>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
        ${balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
      <p className="text-xs text-muted-foreground">Based on your starting balance + logged trades.</p>

      {/* Reset gate */}
      {!showResetConfirm ? (
        <button
          onClick={onToggleReset}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-2"
        >
          <RotateCcw className="h-3 w-3" /> Reset Balance
        </button>
      ) : (
        <div className="mt-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
          <p className="text-xs text-foreground font-medium">Type <span className="font-mono text-destructive">RESET</span> to confirm</p>
          <p className="text-[11px] text-muted-foreground">This will clear your starting balance. You'll need to set a new one.</p>
          <div className="flex gap-2 items-center">
            <Input
              className="max-w-[120px] h-8 text-sm font-mono"
              placeholder="RESET"
              value={resetInput}
              onChange={(e) => onResetInputChange(e.target.value.toUpperCase())}
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={resetInput !== "RESET" || resetting}
              onClick={onConfirmReset}
              className="h-8"
            >
              {resetting ? "Resetting..." : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onToggleReset}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 4. AI Focus ── */
function AIFocusCard({ hasData }: { hasData: boolean }) {
  return (
    <div id="ai-focus-card" className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Focus for Next Trade</h3>
      </div>
      {hasData ? (
        <>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Top Mistake</p>
              <p className="text-sm text-foreground mt-0.5">Entering before confirmation candle</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Focus Rule</p>
              <p className="text-sm text-foreground mt-0.5">Wait for candle close before entry on A+ setups.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Seen in 3 of your last 7 trades</p>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary px-0 h-auto hover:bg-transparent">
            <Eye className="h-3 w-3" /> View reviewed trades
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Log at least 3 trades to unlock AI insights.</p>
      )}
    </div>
  );
}

/* ── 5. Recent Trades (from DB) ── */
const MOBILE_LIMIT = 15;

function RecentTradesSection({ entries, onExportCSV }: { entries: { id: string; trade_date: string; risk_used: number; risk_reward: number; followed_rules: boolean; notes: string | null; created_at: string }[]; onExportCSV: () => void }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Trade Journal</h3>
        <div className="vault-glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No trades logged yet. Use the + Log Trade button to get started.</p>
        </div>
      </div>
    );
  }

  const defaultLimit = isMobile ? MOBILE_LIMIT : 25;
  const showToggle = entries.length > defaultLimit;
  const visibleEntries = expanded ? entries : entries.slice(0, defaultLimit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Trade Journal</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">{entries.length} total trades</span>
      </div>
      <div className="space-y-2">
        {visibleEntries.map((e) => {
          const outcome: "win" | "loss" | "breakeven" = e.risk_reward > 0 ? "win" : e.risk_reward < 0 ? "loss" : "breakeven";
          const s = OUTCOME_STYLES[outcome];
          const pnlNum = e.risk_reward * e.risk_used;
          const pnlStr = pnlNum >= 0 ? `+$${Math.abs(pnlNum).toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`;
          const ticker = e.notes?.split(" ")[0] || "Trade";

          return (
            <div key={e.id} className="vault-glass-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {outcome === "win" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {outcome === "loss" && <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  {outcome === "breakeven" && <Minus className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  <span className="text-sm font-semibold text-foreground">{ticker}</span>
                  <span className="text-xs text-muted-foreground">· {format(new Date(e.trade_date), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{pnlStr}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                  {e.followed_rules ? "✅" : "❌"} Plan Followed
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show all / collapse toggle */}
      {showToggle && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-primary gap-1.5"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Show less</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> Show all {entries.length} trades</>
          )}
        </Button>
      )}

      {/* Mobile hint */}
      {isMobile && !expanded && showToggle && (
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Showing {defaultLimit} most recent trades · expand above or use desktop for full history
        </p>
      )}

      {/* Export */}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1.5"
        onClick={onExportCSV}
      >
        <Download className="h-3 w-3" /> Export All Trades (CSV)
      </Button>
    </div>
  );
}

/* ── 6. Weekly Review ── */
function WeeklyReviewCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
        {hasData && (
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>
        )}
      </div>
      {hasData ? (
        <>
          <p className="text-sm text-muted-foreground">Your weekly review is ready to generate.</p>
          <Button size="sm">Generate Weekly Review</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Need at least 1 week of trades.</p>
          <Button size="sm" disabled>Generate Weekly Review</Button>
        </>
      )}
    </div>
  );
}

/* ── 7. Weekly Balance Check ── */
function WeeklyBalanceCheckCard({ value, onChange, onSave, onSkip, saved }: {
  value: string; onChange: (v: string) => void; onSave: () => void; onSkip: () => void; saved: boolean;
}) {
  if (saved) {
    return (
      <div className="vault-glass-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Weekly Balance Check</h3>
        <p className="text-sm text-emerald-400">Balance updated. Vault is now aligned with your account for this week.</p>
      </div>
    );
  }

  return (
    <div className="vault-glass-card p-6 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Weekly Balance Check</h3>
      <p className="text-sm text-muted-foreground">What does your broker balance show right now?</p>
      <Input type="number" placeholder="$____" className="max-w-[200px]" value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">Optional — helps keep your tracked balance accurate.</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={!value || parseFloat(value) <= 0}>Save Balance</Button>
        <Button size="sm" variant="outline" onClick={onSkip}>Skip for now</Button>
      </div>
    </div>
  );
}

/* ── Shared micro-components ── */
function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default AcademyTrade;
