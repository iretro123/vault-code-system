import { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, TrendingUp, TrendingDown, Minus, Brain, BarChart3, Wallet,
  CalendarCheck, Eye, CheckCircle2, AlertTriangle, RotateCcw, Download,
  ChevronDown, ChevronUp, Lock, RefreshCw, Crosshair, Zap, Shield,
  Sparkles, Flame, Target, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
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
  win: { label: "Win", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: TrendingUp },
  loss: { label: "Loss", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: TrendingDown },
  breakeven: { label: "Breakeven", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Minus },
};

/* ── Page ── */
const AcademyTrade = () => {
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { user } = useAuth();
  const {
    entries, loading: tradesLoading, addEntry, exportCSV, refetch: refetchTrades,
    allTimeWinRate, complianceRate, currentStreak, todayPnl, totalPnl, equityCurve, symbolStats, dayStats,
  } = useTradeLog();

  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>("incomplete");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNoTradeDay, setShowNoTradeDay] = useState(false);
  const [noTradeDay, setNoTradeDay] = useState(false);

  useEffect(() => {
    if (!user) { setBalanceLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("account_balance").eq("user_id", user.id).maybeSingle();
        if (data && data.account_balance > 0) setStartingBalance(data.account_balance);
        else setShowBalanceModal(true);
      } catch { setShowBalanceModal(true); }
      finally { setBalanceLoading(false); }
    })();
  }, [user]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTradeCount = useMemo(() => entries.filter((e) => e.trade_date === todayStr).length, [entries, todayStr]);
  const trackedBalance = useMemo(() => {
    if (startingBalance === null) return null;
    return startingBalance + totalPnl;
  }, [startingBalance, totalPnl]);

  const startOfWeek = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }, []);
  const weekEntries = useMemo(() => entries.filter((e) => new Date(e.trade_date) >= startOfWeek), [entries, startOfWeek]);

  const hasData = entries.length > 0;

  /* ── Handlers ── */
  const handleStartingBalanceSave = async (balance: number) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ account_balance: balance }).eq("user_id", user.id);
      if (error) throw error;
      setStartingBalance(balance);
      setShowBalanceModal(false);
      setBalanceSkipped(false);
      toast({ title: "Starting balance set", description: `Tracking from $${balance.toLocaleString()}.` });
    } catch {
      toast({ title: "Error saving balance", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleBalanceDismiss = () => { setShowBalanceModal(false); setBalanceSkipped(true); };

  const handleResetBalance = async () => {
    if (resetInput !== "RESET" || !user) return;
    setResetting(true);
    try {
      const { error } = await supabase.from("profiles").update({ account_balance: 0 }).eq("user_id", user.id);
      if (error) throw error;
      setStartingBalance(null); setShowResetConfirm(false); setResetInput(""); setShowBalanceModal(true);
      toast({ title: "Balance reset", description: "Set a new starting balance to continue tracking." });
    } catch { toast({ title: "Error resetting balance", variant: "destructive" }); }
    finally { setResetting(false); }
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
    if (error) throw error;
    setShowLogTrade(false);
    setTodayStatus("in_progress");
    setTimeout(() => setShowCheckIn(true), 400);
  };

  const handleCheckInComplete = () => { setShowCheckIn(false); setTodayStatus("complete"); toast({ title: "Check-in complete", description: "AI review is ready for this session." }); };
  const handleNoTradeDayComplete = () => { setShowNoTradeDay(false); setNoTradeDay(true); setTodayStatus("complete"); toast({ title: "No-trade day logged" }); };

  const handleBalanceSave = async () => {
    const val = parseFloat(brokerBalance);
    if (!val || val <= 0 || !user) return;
    try {
      await supabase.from("profiles").update({ account_balance: val }).eq("user_id", user.id);
      setBalanceSaved(true); setStartingBalance(val);
      toast({ title: "Balance updated" });
    } catch { toast({ title: "Error updating balance", variant: "destructive" }); }
  };

  if (!hasAccess && !accessLoading) return <PremiumGate status={status} pageName="My Trades" />;

  if (balanceLoading || tradesLoading) {
    return (
      <>
        <PageHeader title="My Trades" subtitle="Loading your trade data..." />
        <div className="px-4 md:px-6 pb-10 max-w-4xl">
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
        subtitle="Your trading command center — log, track, and improve."
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setShowLogTrade(true)}>
            <Plus className="h-3.5 w-3.5" /> Log Trade
          </Button>
        }
      />
      <div className="px-4 md:px-6 pb-10 space-y-5 max-w-4xl">

        {/* Balance skip reminder */}
        {balanceSkipped && startingBalance === null && (
          <div className="vault-glass-card p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">Starting balance not set</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your stats won't track accurately until you set your starting balance.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => setShowBalanceModal(true)}>Set Balance Now</Button>
          </div>
        )}

        {/* Getting Started */}
        {!hasData && (
          <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
        )}

        {/* ═══ PERFORMANCE HUD ═══ */}
        {hasData && (
          <PerformanceHUD
            balance={trackedBalance}
            todayPnl={todayPnl}
            allTimeWinRate={allTimeWinRate}
            totalTrades={entries.length}
            complianceRate={complianceRate}
            currentStreak={currentStreak}
          />
        )}

        {/* ═══ EQUITY CURVE ═══ */}
        {hasData && equityCurve.length > 1 && startingBalance !== null && (
          <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} />
        )}

        {/* Today's Trade Check */}
        <TodayTradeCheckCard
          count={todayTradeCount} status={todayStatus} noTradeDay={noTradeDay}
          onLogTrade={() => setShowLogTrade(true)} onNoTradeDay={() => setShowNoTradeDay(true)}
          onCompleteCheckIn={() => setShowCheckIn(true)}
          onReviewFeedback={() => document.getElementById("ai-focus-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        />

        {/* AI Mentor */}
        <AIFocusCard entries={entries} />

        {/* ═══ PERFORMANCE BREAKDOWN ═══ */}
        {hasData && symbolStats.length > 0 && (
          <PerformanceBreakdownCard symbolStats={symbolStats} dayStats={dayStats} />
        )}

        {/* ═══ TRADE JOURNAL ═══ */}
        <RecentTradesSection entries={entries} onExportCSV={exportCSV} />

        {/* Tracked Balance / Reset */}
        <TrackedBalanceCard
          balance={trackedBalance} showResetConfirm={showResetConfirm} resetInput={resetInput} resetting={resetting}
          onToggleReset={() => { setShowResetConfirm(!showResetConfirm); setResetInput(""); }}
          onResetInputChange={setResetInput} onConfirmReset={handleResetBalance}
        />

        {/* Weekly Review */}
        <WeeklyReviewCard hasData={hasData} />

      </div>

      <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} />
      <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} />
      <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} />
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PERFORMANCE HUD — Premium cinematic stats strip
   ══════════════════════════════════════════════════════════════════ */
function PerformanceHUD({
  balance, todayPnl, allTimeWinRate, totalTrades, complianceRate, currentStreak,
}: {
  balance: number | null; todayPnl: number; allTimeWinRate: number; totalTrades: number; complianceRate: number; currentStreak: number;
}) {
  const hudItems = [
    {
      label: "BALANCE",
      value: balance !== null ? `$${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      icon: Wallet,
      accent: "text-primary",
      large: true,
    },
    {
      label: "TODAY P/L",
      value: todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`,
      icon: todayPnl >= 0 ? ArrowUpRight : ArrowDownRight,
      accent: todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-muted-foreground",
    },
    {
      label: "WIN RATE",
      value: `${allTimeWinRate}%`,
      icon: Target,
      accent: allTimeWinRate >= 50 ? "text-emerald-400" : "text-amber-400",
    },
    {
      label: "TRADES",
      value: String(totalTrades),
      icon: Activity,
      accent: "text-primary",
    },
    {
      label: "COMPLIANCE",
      value: `${complianceRate}%`,
      icon: Shield,
      accent: complianceRate >= 80 ? "text-emerald-400" : "text-amber-400",
    },
    {
      label: "STREAK",
      value: `${currentStreak}`,
      icon: Flame,
      accent: currentStreak >= 5 ? "text-emerald-400" : currentStreak >= 2 ? "text-amber-400" : "text-muted-foreground",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-1">
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-30"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.15) 20%, transparent 40%, hsl(var(--primary) / 0.1) 60%, transparent 80%)",
          animation: "hudBorderSpin 12s linear infinite",
        }}
      />
      <style>{`@keyframes hudBorderSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

      <div className="relative grid grid-cols-3 md:grid-cols-6 gap-px rounded-xl overflow-hidden bg-border/20">
        {hudItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card px-3 py-3 md:px-4 md:py-4 flex flex-col items-center text-center gap-1">
              <Icon className={`h-3.5 w-3.5 ${item.accent} shrink-0`} />
              <span className="text-[9px] uppercase tracking-[0.1em] font-medium text-muted-foreground/70 leading-none">{item.label}</span>
              <span className={`text-base md:text-lg font-bold tabular-nums leading-none ${item.large ? item.accent : "text-foreground"}`}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EQUITY CURVE — Recharts area chart
   ══════════════════════════════════════════════════════════════════ */
function EquityCurveCard({ equityCurve, startingBalance }: { equityCurve: { date: string; balance: number }[]; startingBalance: number }) {
  // Add starting balance offset to make it absolute
  const chartData = useMemo(() => {
    return [
      { date: "", balance: startingBalance },
      ...equityCurve.map((p) => ({ date: p.date, balance: startingBalance + p.balance })),
    ];
  }, [equityCurve, startingBalance]);

  const currentBalance = chartData[chartData.length - 1]?.balance ?? startingBalance;
  const totalChange = currentBalance - startingBalance;
  const isPositive = totalChange >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Equity Curve</h3>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{totalChange.toFixed(0)} ({((totalChange / startingBalance) * 100).toFixed(1)}%)
        </span>
      </div>
      <div className="h-[160px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={false} axisLine={false} tickLine={false} width={0} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, "Balance"]}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "#34d399" : "#f87171"}
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: isPositive ? "#34d399" : "#f87171" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PERFORMANCE BREAKDOWN — By symbol & day
   ══════════════════════════════════════════════════════════════════ */
function PerformanceBreakdownCard({
  symbolStats,
  dayStats,
}: {
  symbolStats: { symbol: string; trades: number; wins: number; winRate: number; totalPnl: number }[];
  dayStats: { day: string; trades: number; wins: number; winRate: number }[];
}) {
  const [tab, setTab] = useState<"symbol" | "day">("symbol");
  const topSymbols = symbolStats.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Performance Breakdown</h3>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["symbol", "day"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors duration-100 ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t === "symbol" ? "By Symbol" : "By Day"}
            </button>
          ))}
        </div>
      </div>

      {tab === "symbol" && (
        <div className="space-y-2">
          {topSymbols.map((s) => (
            <div key={s.symbol} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/30 px-3 py-2.5">
              <span className="text-sm font-bold text-foreground min-w-[50px]">{s.symbol}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.winRate}%`,
                      background: s.winRate >= 50 ? "linear-gradient(90deg, #34d399, #6ee7b7)" : "linear-gradient(90deg, #f87171, #fca5a5)",
                    }}
                  />
                </div>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                {s.winRate}%
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{s.trades}t</span>
              <span className={`text-xs font-semibold tabular-nums ${s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {s.totalPnl >= 0 ? "+" : ""}${Math.abs(s.totalPnl).toFixed(0)}
              </span>
            </div>
          ))}
          {symbolStats.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No symbol data yet.</p>}
        </div>
      )}

      {tab === "day" && (
        <div className="grid grid-cols-5 md:grid-cols-7 gap-2">
          {dayStats.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-1 rounded-xl bg-muted/20 border border-border/30 px-2 py-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">{d.day}</span>
              <span className={`text-sm font-bold tabular-nums ${d.winRate >= 50 ? "text-emerald-400" : d.trades > 0 ? "text-red-400" : "text-muted-foreground/40"}`}>
                {d.trades > 0 ? `${d.winRate}%` : "—"}
              </span>
              <span className="text-[9px] text-muted-foreground/60 tabular-nums">{d.trades}t</span>
            </div>
          ))}
          {dayStats.length === 0 && <p className="text-xs text-muted-foreground text-center py-3 col-span-full">No day data yet.</p>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Getting Started Banner
   ══════════════════════════════════════════════════════════════════ */
function GettingStartedBanner({ balanceSet, onSetBalance, todayStatus }: { balanceSet: boolean; onSetBalance: () => void; todayStatus: TodayStatus }) {
  const steps = [
    { num: 1, title: "Set your starting balance", desc: "Tell us your current account balance so we can track your progress.", done: balanceSet, active: !balanceSet },
    { num: 2, title: "Log your first trade", desc: "After your next trade, tap the + Log Trade button above.", done: todayStatus !== "incomplete", active: balanceSet && todayStatus === "incomplete" },
    { num: 3, title: "Complete your check-in", desc: "After logging, you'll answer 3 quick questions. Takes 30 seconds.", done: todayStatus === "complete", active: todayStatus === "in_progress" },
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
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
              s.done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : s.active ? "bg-primary/20 border-primary/50 text-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                : "bg-white/5 border-white/10 text-muted-foreground"
            }`}>
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

/* ══════════════════════════════════════════════════════════════════
   Today's Trade Check
   ══════════════════════════════════════════════════════════════════ */
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
    <div className="vault-glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Today's Trade Check</h3>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
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

/* ══════════════════════════════════════════════════════════════════
   AI Focus Card (Real AI)
   ══════════════════════════════════════════════════════════════════ */
const AI_FOCUS_CACHE = "va_cache_ai_focus";

interface AIFocusResult {
  topMistake: string;
  focusRule: string;
  pattern: string;
  encouragement: string;
  sizingAdvice?: string;
  nextSessionTip?: string;
  date: string;
}

function AIFocusCard({ entries }: { entries: { id: string }[] }) {
  const [result, setResult] = useState<AIFocusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tradeCount = entries.length;
  const isLocked = tradeCount < 3;
  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchAnalysis = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(AI_FOCUS_CACHE);
        if (cached) {
          const parsed: AIFocusResult = JSON.parse(cached);
          if (parsed.date === todayStr) { setResult(parsed); return; }
        }
      } catch {}
    }
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trade-focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      if (!resp.ok) { const body = await resp.json().catch(() => ({})); throw new Error(body.error || "Analysis failed"); }
      const data = await resp.json();
      const cached: AIFocusResult = { ...data, date: todayStr };
      setResult(cached);
      try { localStorage.setItem(AI_FOCUS_CACHE, JSON.stringify(cached)); } catch {}
    } catch (e: any) { setError(e.message || "Something went wrong"); }
    finally { setLoading(false); }
  }, [todayStr]);

  useEffect(() => { if (!isLocked) fetchAnalysis(); }, [isLocked, fetchAnalysis]);

  if (isLocked) {
    return (
      <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 space-y-4">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)", backgroundSize: "100% 4px", animation: "scanMove 3s linear infinite" }}
        />
        <style>{`@keyframes scanMove { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }`}</style>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-5 w-5 text-primary/40" />
            <Lock className="h-2.5 w-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">AI Mentor Analysis</h3>
          <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">LOCKED</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Trades scanned</span>
            <span className="text-xs font-mono text-primary">{tradeCount}/3</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(tradeCount / 3) * 100}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Log {3 - tradeCount} more trade{3 - tradeCount > 1 ? "s" : ""} to activate real-time AI analysis of your trading patterns.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">AI Mentor Analysis</h3>
          <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-primary/60 animate-pulse">ANALYZING...</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="ai-focus-card" className="rounded-2xl border border-destructive/20 bg-card p-6 space-y-3">
        <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-destructive" /><h3 className="text-sm font-semibold text-foreground">AI Mentor Analysis</h3></div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fetchAnalysis(true)}><RefreshCw className="h-3.5 w-3.5" /> Retry Analysis</Button>
      </div>
    );
  }

  if (!result) return null;

  const sections = [
    { label: "PATTERN DETECTED", icon: Crosshair, value: result.pattern, color: "text-primary" },
    { label: "TOP MISTAKE", icon: AlertTriangle, value: result.topMistake, color: "text-amber-400" },
    { label: "NEXT TRADE DIRECTIVE", icon: Shield, value: result.focusRule, color: "text-emerald-400" },
  ];

  return (
    <div id="ai-focus-card" className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6 space-y-4">
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.06) 25%, transparent 50%, hsl(var(--primary) / 0.04) 75%, transparent 100%)", animation: "borderSpin 8s linear infinite" }}
      />
      <style>{`@keyframes borderSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>

      <div className="relative flex items-center gap-2">
        <div className="relative">
          <Brain className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" }} />
          <Sparkles className="h-2.5 w-2.5 text-primary/60 absolute -top-1 -right-1" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">AI Mentor Analysis</h3>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-primary/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          SYSTEM ACTIVE · {tradeCount} trades analyzed
        </span>
      </div>

      <div className="relative space-y-3">
        {sections.map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/30 border border-border/50 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <s.icon className={`h-3 w-3 ${s.color}`} />
              <span className={`text-[10px] font-mono uppercase tracking-widest ${s.color}`}>{s.label}</span>
            </div>
            <p className="text-sm text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 pt-2 border-t border-border/30">
        <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary) / 0.3))" }} />
        <p className="text-xs text-muted-foreground italic">{result.encouragement}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary px-0 h-auto hover:bg-transparent" onClick={() => fetchAnalysis(true)}>
          <RefreshCw className="h-3 w-3" /> Refresh Analysis
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Recent Trades (Enhanced)
   ══════════════════════════════════════════════════════════════════ */
const MOBILE_LIMIT = 15;

function RecentTradesSection({ entries, onExportCSV }: {
  entries: { id: string; trade_date: string; risk_used: number; risk_reward: number; followed_rules: boolean; notes: string | null; created_at: string; symbol?: string; outcome?: string }[];
  onExportCSV: () => void;
}) {
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
          const Icon = s.icon;
          const pnlNum = e.risk_reward * e.risk_used;
          const pnlStr = pnlNum >= 0 ? `+$${Math.abs(pnlNum).toFixed(0)}` : `-$${Math.abs(pnlNum).toFixed(0)}`;
          const ticker = e.symbol || e.notes?.split(" ")[0] || "Trade";

          // Parse setup/direction/accountability from notes
          const noteParts = e.notes?.split(" | ") || [];
          const directionPart = noteParts[0]?.split(" ")[1]; // "Calls" or "Puts"
          const setupPart = noteParts.find((p) => p.startsWith("Setup:"))?.replace("Setup: ", "");
          const targetPart = noteParts.find((p) => p.startsWith("Target:"))?.replace("Target: ", "");
          const stopPart = noteParts.find((p) => p.startsWith("Stop:"))?.replace("Stop: ", "");

          return (
            <div key={e.id} className="vault-glass-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-3.5 w-3.5 ${s.color} shrink-0`} />
                  <span className="text-sm font-bold text-foreground">{ticker}</span>
                  {directionPart && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 text-muted-foreground">{directionPart}</span>
                  )}
                  <span className="text-xs text-muted-foreground">· {format(new Date(e.trade_date), "MMM d")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.color}`}>{s.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${s.color}`}>{pnlStr}</span>
                </div>
              </div>
              {/* Accountability badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                  {e.followed_rules ? "✅" : "❌"} Plan
                </span>
                {targetPart && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                    🎯 {targetPart}
                  </span>
                )}
                {stopPart && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-muted-foreground">
                    🛑 Stop: {stopPart}
                  </span>
                )}
                {setupPart && setupPart !== "—" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary">
                    {setupPart}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showToggle && (
        <Button variant="ghost" size="sm" className="w-full text-xs text-primary gap-1.5" onClick={() => setExpanded(!expanded)}>
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {entries.length} trades</>}
        </Button>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={onExportCSV}>
        <Download className="h-3 w-3" /> Export All Trades (CSV)
      </Button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Tracked Balance Card
   ══════════════════════════════════════════════════════════════════ */
function TrackedBalanceCard({
  balance, showResetConfirm, resetInput, resetting, onToggleReset, onResetInputChange, onConfirmReset,
}: {
  balance: number | null; showResetConfirm: boolean; resetInput: string; resetting: boolean;
  onToggleReset: () => void; onResetInputChange: (v: string) => void; onConfirmReset: () => void;
}) {
  if (balance === null) return null;

  return (
    <div className="vault-glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Balance Management</h3>
      </div>
      <p className="text-xs text-muted-foreground">Based on your starting balance + logged trades.</p>

      {!showResetConfirm ? (
        <button onClick={onToggleReset} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          <RotateCcw className="h-3 w-3" /> Reset Balance
        </button>
      ) : (
        <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
          <p className="text-xs text-foreground font-medium">Type <span className="font-mono text-destructive">RESET</span> to confirm</p>
          <p className="text-[11px] text-muted-foreground">This will clear your starting balance. You'll need to set a new one.</p>
          <div className="flex gap-2 items-center">
            <Input className="max-w-[120px] h-8 text-sm font-mono" placeholder="RESET" value={resetInput} onChange={(e) => onResetInputChange(e.target.value.toUpperCase())} />
            <Button size="sm" variant="destructive" disabled={resetInput !== "RESET" || resetting} onClick={onConfirmReset} className="h-8">{resetting ? "Resetting..." : "Confirm"}</Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onToggleReset}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Weekly Review & Balance Check
   ══════════════════════════════════════════════════════════════════ */
function WeeklyReviewCard({ hasData }: { hasData: boolean }) {
  return (
    <div className="vault-glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
        {hasData && <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>}
      </div>
      {hasData ? (
        <><p className="text-sm text-muted-foreground">Your weekly review is ready to generate.</p><Button size="sm">Generate Weekly Review</Button></>
      ) : (
        <><p className="text-sm text-muted-foreground">Need at least 1 week of trades.</p><Button size="sm" disabled>Generate Weekly Review</Button></>
      )}
    </div>
  );
}

function WeeklyBalanceCheckCard({ value, onChange, onSave, onSkip, saved }: {
  value: string; onChange: (v: string) => void; onSave: () => void; onSkip: () => void; saved: boolean;
}) {
  if (saved) {
    return (
      <div className="vault-glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Weekly Balance Check</h3>
        <p className="text-sm text-emerald-400">Balance updated. Vault is now aligned with your account for this week.</p>
      </div>
    );
  }
  return (
    <div className="vault-glass-card p-5 space-y-3">
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

export default AcademyTrade;
