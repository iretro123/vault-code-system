import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Minus, Brain, BarChart3, Wallet, CalendarCheck, Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { LogTradeSheet, type TradeFormData } from "@/components/academy/LogTradeSheet";
import { SetStartingBalanceModal } from "@/components/academy/SetStartingBalanceModal";
import { QuickCheckInSheet } from "@/components/academy/QuickCheckInSheet";
import { NoTradeDaySheet } from "@/components/academy/NoTradeDaySheet";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

/* ── Types ── */
interface MockTrade {
  ticker: string;
  date: string;
  direction: string;
  outcome: "win" | "loss" | "breakeven";
  pnl: string;
  pnlNum: number;
  chips: { label: string; passed: boolean | "partial" }[];
}

type TodayStatus = "incomplete" | "in_progress" | "complete";

const OUTCOME_STYLES = {
  win: { label: "Win", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  loss: { label: "Loss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  breakeven: { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

/* ── Page ── */
const AcademyTrade = () => {
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();

  // Core state
  const [trades, setTrades] = useState<MockTrade[]>([]);
  const [showLogTrade, setShowLogTrade] = useState(false);

  // Accountability state
  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(true);
  const [trackedBalance, setTrackedBalance] = useState(0);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>("incomplete");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNoTradeDay, setShowNoTradeDay] = useState(false);
  const [noTradeDay, setNoTradeDay] = useState(false);

  // Weekly balance check
  const [brokerBalance, setBrokerBalance] = useState("");
  const [balanceSaved, setBalanceSaved] = useState(false);
  const [balanceCheckDismissed, setBalanceCheckDismissed] = useState(false);

  const todayTradeCount = useMemo(() => {
    const todayStr = format(new Date(), "MMM d");
    return trades.filter((t) => t.date.startsWith(todayStr)).length;
  }, [trades]);

  const hasData = trades.length > 0;

  /* ── Handlers ── */
  const handleStartingBalanceSave = (balance: number) => {
    setStartingBalance(balance);
    setTrackedBalance(balance);
    setShowBalanceModal(false);
    setBalanceSkipped(false);
    toast({ title: "Starting balance set", description: `Tracking from $${balance.toLocaleString()}.` });
  };

  const handleBalanceDismiss = () => {
    setShowBalanceModal(false);
    setBalanceSkipped(true);
  };

  const handleTradeSubmit = (data: TradeFormData) => {
    const resultMap: Record<string, "win" | "loss" | "breakeven"> = {
      Win: "win", Loss: "loss", Breakeven: "breakeven",
    };
    const pnlNum = parseFloat(data.pnl) || 0;
    const pnlStr = pnlNum >= 0 ? `+$${Math.abs(pnlNum).toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`;

    const newTrade: MockTrade = {
      ticker: data.symbol,
      date: format(data.date, "MMM d, h:mm a"),
      direction: data.direction,
      outcome: resultMap[data.resultType] || "breakeven",
      pnl: pnlStr,
      pnlNum,
      chips: [
        { label: "Target Hit", passed: data.targetHit === "Yes" ? true : data.targetHit === "Partial" ? "partial" : false },
        { label: "Plan Followed", passed: data.planFollowed === "Yes" },
        { label: "Stop Respected", passed: data.stopRespected === "Yes" },
      ],
    };

    setTrades((prev) => [newTrade, ...prev]);
    setTrackedBalance((prev) => prev + pnlNum);
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

  const handleBalanceSave = () => {
    const val = parseFloat(brokerBalance);
    if (!val || val <= 0) return;
    setBalanceSaved(true);
    setTrackedBalance(val);
    toast({ title: "Balance updated", description: "Vault is now aligned with your account for this week." });
  };

  if (!hasAccess && !accessLoading) {
    return (
      <>
        <PremiumGate status={status} pageName="My Trades" />
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
        />
        <WeeklyProgressCard hasData={hasData} />
        <TrackedBalanceCard balance={startingBalance !== null ? trackedBalance : null} />
        <AIFocusCard hasData={hasData} />
        <RecentTradesSection trades={trades} />
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
    </AcademyLayout>
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
  count, status, noTradeDay, onLogTrade, onNoTradeDay, onCompleteCheckIn,
}: {
  count: number; status: TodayStatus; noTradeDay: boolean;
  onLogTrade: () => void; onNoTradeDay: () => void; onCompleteCheckIn: () => void;
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
          <Button size="sm" variant="outline" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Review today's feedback</Button>
        </>
      )}
    </div>
  );
}

/* ── 2. Weekly Progress ── */
function WeeklyProgressCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Weekly Progress</h3>
      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Trades Logged" value="0" />
            <StatBlock label="Win Rate" value="--" />
            <StatBlock label="P/L" value="--" />
            <StatBlock label="Plan Follow Rate" value="--" />
          </div>
          <p className="text-xs text-muted-foreground">Updated automatically when you log trades.</p>
        </>
      ) : (
        <div className="py-2">
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Trades Logged" value="0" />
            <StatBlock label="Win Rate" value="--" />
            <StatBlock label="P/L" value="--" />
            <StatBlock label="Plan Follow Rate" value="--" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">Log your first trade to see stats here.</p>
        </div>
      )}
    </div>
  );
}

/* ── 3. Tracked Balance ── */
function TrackedBalanceCard({ balance }: { balance: number | null }) {
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
    </div>
  );
}

/* ── 4. AI Focus ── */
function AIFocusCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="vault-glass-card p-6 space-y-3">
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

/* ── 5. Recent Trades ── */
function RecentTradesSection({ trades }: { trades: MockTrade[] }) {
  if (trades.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
        <div className="vault-glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No trades logged yet. Use the + Log Trade button to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
      <div className="space-y-2">
        {trades.map((t, i) => {
          const s = OUTCOME_STYLES[t.outcome];
          return (
            <div key={t.ticker + t.date + i} className="vault-glass-card p-4 space-y-2 cursor-pointer hover:border-white/10 transition-colors duration-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {t.outcome === "win" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {t.outcome === "loss" && <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  {t.outcome === "breakeven" && <Minus className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                  <span className="text-sm font-semibold text-foreground">{t.ticker}</span>
                  <span className="text-xs text-muted-foreground">· {t.date}</span>
                  <span className="text-xs text-muted-foreground">— {t.direction}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                  <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{t.pnl}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.chips.map((c) => (
                  <span key={c.label} className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                    {c.passed === true ? "✅" : c.passed === false ? "❌" : "◐"} {c.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" className="w-full text-xs text-primary">View all trades</Button>
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
