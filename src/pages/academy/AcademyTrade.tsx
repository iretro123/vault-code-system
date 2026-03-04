import { useState, useMemo } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, TrendingDown, Minus, Brain, BarChart3, Wallet, CalendarCheck, Eye } from "lucide-react";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { LogTradeSheet, type TradeFormData } from "@/components/academy/LogTradeSheet";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

/* ── Types ── */
interface MockTrade {
  ticker: string;
  date: string;
  direction: string;
  outcome: "win" | "loss" | "breakeven";
  pnl: string;
  chips: { label: string; passed: boolean | "partial" }[];
}

/* ── Initial mock data ── */
const INITIAL_TRADES: MockTrade[] = [
  {
    ticker: "SPY", date: "Mar 4, 10:42 AM", direction: "Calls", outcome: "win",
    pnl: "+$124", chips: [
      { label: "Target Hit", passed: true },
      { label: "Plan Followed", passed: true },
      { label: "Stop Respected", passed: true },
    ],
  },
  {
    ticker: "TSLA", date: "Mar 4, 1:18 PM", direction: "Puts", outcome: "loss",
    pnl: "-$86", chips: [
      { label: "Target Hit", passed: false },
      { label: "Plan Followed", passed: false },
      { label: "Stop Respected", passed: true },
    ],
  },
  {
    ticker: "NVDA", date: "Mar 3, 11:05 AM", direction: "Calls", outcome: "breakeven",
    pnl: "$0", chips: [
      { label: "Partial Target", passed: "partial" },
      { label: "Plan Followed", passed: true },
      { label: "Stop Respected", passed: true },
    ],
  },
];

const OUTCOME_STYLES = {
  win: { label: "Win", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  loss: { label: "Loss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  breakeven: { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
};

/* ── Page ── */
const AcademyTrade = () => {
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [trades, setTrades] = useState<MockTrade[]>(INITIAL_TRADES);

  const todayTradeCount = useMemo(() => {
    const todayStr = format(new Date(), "MMM d");
    return trades.filter((t) => t.date.startsWith(todayStr)).length;
  }, [trades]);

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
      chips: [
        { label: "Target Hit", passed: data.targetHit === "Yes" ? true : data.targetHit === "Partial" ? "partial" : false },
        { label: "Plan Followed", passed: data.planFollowed === "Yes" },
        { label: "Stop Respected", passed: data.stopRespected === "Yes" },
      ],
    };

    setTrades((prev) => [newTrade, ...prev]);
    setShowLogTrade(false);
    toast({
      title: "Trade logged ✅",
      description: "Vault updated your stats and generated your AI review.",
    });
  };

  if (!hasAccess && !accessLoading) {
    return (
      <AcademyLayout>
        <PremiumGate status={status} pageName="My Trades" />
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
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
        <TodayTradeCheckCard count={todayTradeCount} onLogTrade={() => setShowLogTrade(true)} />
        <WeeklyProgressCard />
        <TrackedBalanceCard />
        <AIFocusCard />
        <RecentTradesSection trades={trades} />
        <WeeklyReviewCard />
        <WeeklyBalanceCheckCard />
      </div>

      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} />
    </AcademyLayout>
  );
};

/* ── 1. Today's Trade Check ── */
function TodayTradeCheckCard({ count, onLogTrade }: { count: number; onLogTrade: () => void }) {
  const isIncomplete = count === 0;
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Today's Trade Check</h3>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${isIncomplete ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
          {isIncomplete ? "Incomplete" : "In progress"}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <StatMini label="Status" value={isIncomplete ? "Incomplete" : "In progress"} />
        <StatMini label="Trades logged" value={String(count)} />
        <StatMini label="Check-in" value="Not started" />
        <StatMini label="AI review" value={count > 0 ? "Generated" : "Waiting"} />
      </div>
      <p className="text-xs text-muted-foreground">
        Complete today's trade check to keep your progress tracking accurate.
      </p>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5" onClick={onLogTrade}>
          <Plus className="h-3.5 w-3.5" /> Log today's trade
        </Button>
        <Button size="sm" variant="outline">Mark no-trade day</Button>
      </div>
    </div>
  );
}

/* ── 2. Weekly Progress ── */
function WeeklyProgressCard() {
  return (
    <div className="vault-glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Weekly Progress</h3>
      <div className="grid grid-cols-2 gap-4">
        <StatBlock label="Trades Logged" value="8" />
        <StatBlock label="Win Rate" value="62%" accent />
        <StatBlock label="P/L" value="+$438" accent />
        <StatBlock label="Plan Follow Rate" value="78%" />
      </div>
      <p className="text-xs text-muted-foreground">Updated automatically when you log trades.</p>
    </div>
  );
}

/* ── 3. Tracked Balance ── */
function TrackedBalanceCard() {
  return (
    <div className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Tracked Balance</h3>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">$3,142</p>
      <div className="flex gap-4">
        <span className="text-xs text-emerald-400 font-medium">Today: +$86</span>
        <span className="text-xs text-emerald-400 font-medium">This Week: +$438</span>
      </div>
      <p className="text-xs text-muted-foreground">Based on your starting balance + logged trades.</p>
    </div>
  );
}

/* ── 4. AI Focus ── */
function AIFocusCard() {
  return (
    <div className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Focus for Next Trade</h3>
      </div>
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
    </div>
  );
}

/* ── 5. Recent Trades ── */
function RecentTradesSection({ trades }: { trades: MockTrade[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
      <div className="space-y-2">
        {trades.map((t, i) => {
          const s = OUTCOME_STYLES[t.outcome];
          return (
            <div
              key={t.ticker + t.date + i}
              className="vault-glass-card p-4 space-y-2 cursor-pointer hover:border-white/10 transition-colors duration-100"
            >
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
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>
                    {s.label}
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${s.color}`}>{t.pnl}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.chips.map((c) => (
                  <span
                    key={c.label}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground"
                  >
                    {c.passed === true ? "✅" : c.passed === false ? "❌" : "◐"} {c.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" className="w-full text-xs text-primary">
        View all trades
      </Button>
    </div>
  );
}

/* ── 6. Weekly Review ── */
function WeeklyReviewCard() {
  return (
    <div className="vault-glass-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Ready
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Your weekly review is ready to generate.</p>
      <Button size="sm">Generate Weekly Review</Button>
    </div>
  );
}

/* ── 7. Weekly Balance Check ── */
function WeeklyBalanceCheckCard() {
  return (
    <div className="vault-glass-card p-6 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Weekly Balance Check</h3>
      <p className="text-sm text-muted-foreground">What does your broker balance show right now?</p>
      <Input type="number" placeholder="$____" className="max-w-[200px]" />
      <p className="text-xs text-muted-foreground">Optional — helps keep your tracked balance accurate.</p>
      <div className="flex gap-2">
        <Button size="sm">Save Balance</Button>
        <Button size="sm" variant="outline">Skip for now</Button>
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
