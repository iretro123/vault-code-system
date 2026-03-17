import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Shield, AlertTriangle, CheckCircle2, Brain, ChevronRight, ChevronDown, ClipboardCheck, Calendar, Radio, Lock, CalendarOff, BarChart3, Wallet, Target, Zap, X, Square } from "lucide-react";
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
import { useTradeLog, computePnl } from "@/hooks/useTradeLog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { useApprovedPlans, type ApprovedPlan } from "@/hooks/useApprovedPlans";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useSessionStage } from "@/hooks/useSessionStage";
import { useVaultState } from "@/contexts/VaultStateContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";
import { MAX_LOSSES_PER_DAY, computeVaultLimits } from "@/lib/vaultConstants";

// Extracted components
import { SectionLabel } from "@/components/trade-os/SectionLabel";
import { PerformanceHUD } from "@/components/trade-os/PerformanceHUD";
import { EquityCurveCard } from "@/components/trade-os/EquityCurveCard";
import { PerformanceBreakdownCard } from "@/components/trade-os/PerformanceBreakdownCard";
import { GettingStartedBanner } from "@/components/trade-os/GettingStartedBanner";
import { TodayVaultCheckCard } from "@/components/trade-os/TodayVaultCheckCard";
import { AIFocusCard } from "@/components/trade-os/AIFocusCard";
import { RecentTradesSection } from "@/components/trade-os/RecentTradesSection";

import { BalanceAdjustmentCard } from "@/components/trade-os/BalanceAdjustmentCard";
import { useBalanceAdjustments } from "@/hooks/useBalanceAdjustments";
import { WeeklyReviewCard } from "@/components/trade-os/WeeklyReviewCard";
import { OSTabHeader } from "@/components/trade-os/OSTabHeader";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { VaultTradePlanner } from "@/components/vault-planner/VaultTradePlanner";
import { OSControlRail } from "@/components/trade-os/OSControlRail";
import { useCoachingNudge } from "@/hooks/useCoachingNudge";
import { CoachingNudgeModal } from "@/components/academy/CoachingNudgeModal";
import { SessionSetupCard, SessionCountdownLine, loadTimes } from "@/components/trade-os/SessionSetupCard";
import type { SessionTimes } from "@/components/trade-os/SessionSetupCard";
import type { SessionPhaseLabel } from "@/components/trade-os/SessionSetupCard";
import { Progress } from "@/components/ui/progress";

type TodayStatus = "incomplete" | "in_progress" | "complete";

const STAGE_HEADLINES: Record<string, { title: string; subtitle: string; guidance: string }> = {
  plan: {
    title: "Pre-Market Plan",
    subtitle: "Build your trade. Size it. Get approved.",
    guidance: "Set your budget, build a plan, get it approved. Then move to Live.",
  },
  live: {
    title: "Live Session",
    subtitle: "Follow your plan. Track your limits.",
    guidance: "Your plan is active. Monitor limits. Log when done.",
  },
  review: {
    title: "Session Review",
    subtitle: "Log results. Record what happened.",
    guidance: "Log all trades, complete your check-in, then see what AI found.",
  },
  insights: {
    title: "Performance Intelligence",
    subtitle: "AI-scanned behavior across your trades.",
    guidance: "AI scans your last 50 trades for leaks, edges, and patterns.",
  },
};

function StageHeadline({ stage }: { stage: string }) {
  const h = STAGE_HEADLINES[stage];
  if (!h) return null;
  return (
    <div className="px-0.5 pt-2 pb-1">
      <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight">{h.title}</h2>
      <p className="text-[11px] text-muted-foreground/70 font-medium mt-0.5">{h.subtitle}</p>
    </div>
  );
}

function InsightMiniCard({ label, dotColor, text }: { label: string; dotColor: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > 60 ? text.slice(0, 60) + "…" : text;
  return (
    <div
      className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 cursor-pointer hover:bg-white/[0.04] transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-[12px] text-foreground/80 font-medium leading-snug">{expanded ? text : truncated}</p>
    </div>
  );
}

// Cache-bust: clear stale trade caches after data migration (v3)
const CACHE_BUST_KEY = "va_cache_bust_v3";
if (!localStorage.getItem(CACHE_BUST_KEY)) {
  localStorage.removeItem("va_cache_ai_focus_v3");
  localStorage.removeItem("va_cache_ai_focus_ts");
  localStorage.removeItem("va_cache_trade_entries");
  localStorage.removeItem("va_cache_trade_entries_ts");
  localStorage.setItem(CACHE_BUST_KEY, "1");
}

const AcademyTrade = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { user, session } = useAuth();
  const { isPageEnabled } = useFeatureFlags();
  const { state: vaultState } = useVaultState();
  const { isAdminActive } = useAdminMode();
  
  const {
    entries, loading: tradesLoading, addEntry, deleteEntry, exportCSV, refetch: refetchTrades,
    allTimeWinRate, complianceRate, currentStreak, todayPnl, totalPnl, equityCurve, symbolStats, dayStats,
    last10WinRate, weeklyComplianceRate, bestStreak, allTimeHigh,
  } = useTradeLog();
  const { activePlan, todayPlans, loading: planLoading, cancelPlan, markLogged, refetch: refetchPlan } = useApprovedPlans();
  const { adjustments, totalAdjustments, addAdjustment, removeAdjustment, clearAll: clearAllAdjustments, refetch: refetchAdjustments } = useBalanceAdjustments();

  const plannerRef = useRef<HTMLDivElement>(null);

  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [logPlanId, setLogPlanId] = useState<string | undefined>(undefined);
  const [logPrefill, setLogPrefill] = useState<any>(undefined);
  const [todayStatus, setTodayStatus] = useState<TodayStatus>("incomplete");
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNoTradeDay, setShowNoTradeDay] = useState(false);
  const [noTradeDay, setNoTradeDay] = useState(false);
  const [executing, setExecuting] = useState(() => {
    try { const d = format(new Date(), "yyyy-MM-dd"); return localStorage.getItem("va_executing_today") === d; } catch { return false; }
  });
  const [executionStart, setExecutionStart] = useState<number | null>(() => {
    try { const v = localStorage.getItem("va_execution_start"); return v ? Number(v) : null; } catch { return null; }
  });
  const [sessionPhase, setSessionPhase] = useState<SessionPhaseLabel>(null);
  const [cutoffOverride, setCutoffOverride] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  const nudge = useCoachingNudge({ entries, totalPnl, startingBalance: startingBalance ?? 0, complianceRate });

  // Reset banner dismissal when phase changes
  useEffect(() => { setDismissedBanner(false); }, [sessionPhase]);
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
    return Math.max(0, startingBalance + totalAdjustments + totalPnl);
  }, [startingBalance, totalAdjustments, totalPnl]);

  const hasData = entries.length > 0;

  // Persist todayStatus + noTradeDay: check journal_entries for today on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select("id, what_happened")
        .eq("user_id", user.id)
        .eq("entry_date", todayStr)
        .limit(1);
      if (data && data.length > 0) {
        setTodayStatus("complete");
        // Detect no-trade day from journal (no trades logged today + journal exists)
        if (todayTradeCount === 0) setNoTradeDay(true);
      } else if (todayTradeCount > 0) {
        setTodayStatus("in_progress");
      }
    })();
  }, [user, todayStr, todayTradeCount]);

  useEffect(() => {
    if (todayTradeCount > 0 && todayStatus === "incomplete") {
      setTodayStatus("in_progress");
    }
  }, [todayTradeCount]);

  const sessionTimesSet = useMemo(() => !!loadTimes(), [sessionPhase]);

  const { activeStage, setStage, stageStatus, dayState, dayStateStatus, dayStateCta } = useSessionStage({
    hasActivePlan: !!activePlan,
    todayTradeCount,
    todayStatus,
    sessionActive: !vaultState.session_paused,
    sessionTimesSet,
    sessionPhase,
  });

  const cachedAI = useMemo(() => {
    try {
      const raw = localStorage.getItem("va_cache_ai_focus_v3");
      if (!raw) return null;
      return JSON.parse(raw) as { primaryLeak?: string; riskGrade?: string; nextAction?: string; strongestEdge?: string };
    } catch { return null; }
  }, [entries.length]);

  const totalMaxTrades = MAX_LOSSES_PER_DAY;

  const todayEntries = useMemo(() => entries.filter(e => e.trade_date === todayStr), [entries, todayStr]);
  const todayCompliance = useMemo(() => {
    if (todayEntries.length === 0) return 100;
    const compliant = todayEntries.filter(e => e.followed_rules).length;
    return Math.round((compliant / todayEntries.length) * 100);
  }, [todayEntries]);

  const recentFive = useMemo(() => entries.slice(0, 5), [entries]);

  // Cutoff enforcement
  const isCutoffOrClosed = sessionPhase === "No new entries" || sessionPhase === "Session closed";

  // Execution timer
  const [execElapsed, setExecElapsed] = useState(0);
  useEffect(() => {
    if (!executing || !executionStart) return;
    const id = setInterval(() => setExecElapsed(Date.now() - executionStart), 1000);
    return () => clearInterval(id);
  }, [executing, executionStart]);

  const fmtExecTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

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
      // Clear adjustment history first, then zero the starting balance
      await clearAllAdjustments();
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
    const contractsNum = parseInt(data.positionSize) || undefined;
    const entryNum = parseFloat(data.entryPrice) || undefined;
    const exitNum = parseFloat(data.exitPrice) || undefined;

    // Compute planned risk: contracts × (entry - stop) × 100 if plan exists
    let plannedRisk: number | undefined;
    let isOversized = false;
    if (logPlanId && activePlan) {
      const stopDist = activePlan.stop_price_planned
        ? Math.abs(activePlan.entry_price_planned - Number(activePlan.stop_price_planned))
        : 0;
      plannedRisk = activePlan.contracts_planned * stopDist * 100;
      // Auto-detect oversized: actual contracts > planned contracts
      if (contractsNum && contractsNum > activePlan.contracts_planned) {
        isOversized = true;
      }
    }

    let screenshotUrl: string | undefined;
    if (data.screenshotFile && user) {
      const ext = data.screenshotFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("trade-screenshots")
        .upload(path, data.screenshotFile, { contentType: data.screenshotFile.type, upsert: false });
      if (uploadErr) {
        toast({ title: "Screenshot upload failed", description: uploadErr.message, variant: "destructive" });
      } else {
        const { data: urlData } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
        screenshotUrl = urlData.publicUrl;
      }
    }

    const newEntry: any = {
      risk_used: Math.abs(pnlNum),
      risk_reward: pnlNum,  // store actual signed dollar P/L
      followed_rules: data.planFollowed === "Yes",
      emotional_state: 5,
      notes: `${data.symbol} ${data.direction} | Setup: ${data.setupUsed || "—"} | Target: ${data.targetHit} | Stop: ${data.stopRespected} | Oversized: ${isOversized || data.oversized === "Yes" ? "Yes" : "No"}${data.note ? " | " + data.note : ""}${cutoffOverride ? " | ⚠️ Logged after cutoff" : ""}`,
      symbol: data.symbol.toUpperCase(),
      outcome: isWin ? "WIN" : isLoss ? "LOSS" : "BREAKEVEN",
      trade_date: format(data.date, "yyyy-MM-dd"),
      plan_id: logPlanId,
      // Structured options fields
      actual_pnl: pnlNum,
      contracts: contractsNum,
      entry_price: entryNum,
      exit_price: exitNum,
      planned_risk_dollars: plannedRisk,
      is_oversized: isOversized || data.oversized === "Yes",
    };
    if (screenshotUrl) newEntry.screenshot_url = screenshotUrl;

    const { error } = await addEntry(newEntry);
    if (error) throw error;

    // #4: Decrement risk budget after a loss
    if (isLoss && user) {
      try {
        await supabase.rpc('decrement_risk_budget' as any, { p_user_id: user.id, p_amount: Math.abs(pnlNum) });
      } catch (e) { console.warn("Risk budget decrement failed:", e); }
    }

    if (logPlanId) {
      await markLogged(logPlanId);
      refetchPlan();
    }

    // Don't close sheet — let "Log Another" handle it
    setLogPlanId(undefined);
    setLogPrefill(undefined);
    setTodayStatus("in_progress");
    setExecuting(false);
    setExecutionStart(null);
    try { localStorage.removeItem("va_executing_today"); localStorage.removeItem("va_execution_start"); } catch {}
    setCutoffOverride(false);

    // Smart coaching nudge — show after 1.5s if conditions met
    if (nudge.shouldShow) {
      setTimeout(() => setShowNudge(true), 1500);
    }
  };

  const handleLogFromPlan = (plan: ApprovedPlan) => {
    setLogPlanId(plan.id);
    setLogPrefill({
      symbol: plan.ticker || "",
      direction: plan.direction === "calls" ? "Calls" : "Puts",
      entryPrice: String(plan.entry_price_planned),
      positionSize: String(plan.contracts_planned),
    });
    setShowLogTrade(true);
  };

  const handleLogUnplanned = () => {
    setLogPlanId(undefined);
    setLogPrefill(undefined);
    setShowLogTrade(true);
  };

  const handleCancelPlan = async (planId: string) => {
    await cancelPlan(planId);
    refetchPlan();
    toast({ title: "Plan cancelled" });
  };

  const handleScrollToPlanner = () => {
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleCheckInComplete = () => { setShowCheckIn(false); setTodayStatus("complete"); toast({ title: "Check-in complete", description: "AI review is ready for this session." }); };
  const handleNoTradeDayComplete = () => { setShowNoTradeDay(false); setNoTradeDay(true); setTodayStatus("complete"); toast({ title: "No-trade day logged" }); };

  const handleDeleteEntry = async (id: string) => {
    const result = await deleteEntry(id);
    if (!result.error) refetchPlan();
    return result;
  };

  const handleMarkExecuting = () => {
    setExecuting(true);
    const now = Date.now();
    setExecutionStart(now);
    try {
      localStorage.setItem("va_executing_today", todayStr);
      localStorage.setItem("va_execution_start", String(now));
    } catch {}
  };

  const handleLogWithCutoffCheck = (plan?: ApprovedPlan) => {
    if (isCutoffOrClosed) {
      setCutoffOverride(true);
    }
    if (plan) handleLogFromPlan(plan);
    else handleLogUnplanned();
  };

  const handleQuickAction = useCallback(() => {
    switch (dayState) {
      case "no_plan": handleScrollToPlanner(); break;
      case "plan_approved": setStage("live"); break;
      case "live_session":
        if (activePlan) handleLogWithCutoffCheck(activePlan);
        else handleLogWithCutoffCheck();
        break;
      case "review_pending": setShowCheckIn(true); break;
      case "day_complete": setStage("insights"); break;
    }
  }, [dayState, activePlan]);

  if (balanceLoading || tradesLoading) {
    return (
      <>
        <PageHeader title="My Trades" subtitle="Loading your trade data..." />
        <div className="px-4 md:px-6 pb-10 max-w-5xl">
          <div className="vault-glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  const useOSLayout = isPageEnabled("trade-os");

  // ──── CLASSIC LAYOUT (feature flag OFF) ────
  if (!useOSLayout) {
    return (
      <>
        <PageHeader
          title="My Trades"
          subtitle="Your trading command center — log, track, and improve."
          compact
          action={
            <div className="flex gap-1.5">
              <Button size="sm" className="gap-1 h-8 px-3 text-xs rounded-full" onClick={handleLogUnplanned}>
                <Plus className="h-3 w-3" /> Log
              </Button>
              <Button size="sm" variant="outline" className="gap-1 h-8 px-3 text-xs rounded-full" onClick={() => navigate("/academy/vault")}>
                <Shield className="h-3 w-3" /> Check
              </Button>
            </div>
          }
        />
        <div className="px-4 md:px-6 pb-10 space-y-4 md:space-y-5 max-w-4xl">
          {balanceSkipped && startingBalance === null && (
            <div className="vault-glass-card p-3 md:p-4 border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-xs text-foreground font-medium flex-1 min-w-0">Starting balance not set</p>
              <Button size="sm" variant="outline" className="shrink-0 text-[11px] h-7 px-2.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full" onClick={() => setShowBalanceModal(true)}>Set Now</Button>
            </div>
          )}
          {!hasData && (
            <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
          )}
          {hasData && (
            <section className="space-y-2.5">
              <SectionLabel>Performance</SectionLabel>
              <PerformanceHUD balance={trackedBalance} todayPnl={todayPnl} allTimeWinRate={allTimeWinRate} totalTrades={entries.length} complianceRate={complianceRate} currentStreak={currentStreak} />
              {equityCurve.length > 1 && startingBalance !== null && (
                <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} adjustments={adjustments.map(a => ({ date: a.adjustment_date, amount: Number(a.amount) }))} winRate={allTimeWinRate} totalTrades={entries.length} />
              )}
            </section>
          )}
          {trackedBalance !== null && (
            <section className="space-y-2.5">
              <SectionLabel>Account</SectionLabel>
              <BalanceAdjustmentCard
                balance={trackedBalance}
                onAddFunds={async (amt, note) => {
                  const ok = await addAdjustment(amt, note);
                  if (ok) toast({ title: "Funds added", description: `+$${amt.toLocaleString()} recorded.` });
                  return ok;
                }}
                onWithdraw={async (amt, note) => {
                  const ok = await addAdjustment(-amt, note);
                  if (ok) toast({ title: "Withdrawal recorded", description: `-$${amt.toLocaleString()} recorded.` });
                  return ok;
                }}
                onReset={async () => {
                  await handleResetBalance();
                }}
                onDeleteAdjustment={async (id) => {
                  const ok = await removeAdjustment(id);
                  if (ok) toast({ title: "Adjustment removed" });
                  return ok;
                }}
                adjustments={adjustments}
                resetting={resetting}
              />
            </section>
          )}
          <section className="space-y-2.5">
            <SectionLabel>Today</SectionLabel>
            <TodayVaultCheckCard
              activePlan={activePlan} todayTradeCount={todayTradeCount} todayStatus={todayStatus} noTradeDay={noTradeDay}
              onCheckTrade={() => navigate("/academy/vault")} onLogFromPlan={handleLogFromPlan} onLogUnplanned={handleLogUnplanned}
              onCancelPlan={handleCancelPlan} onNoTradeDay={() => setShowNoTradeDay(true)}
              onCompleteCheckIn={() => setShowCheckIn(true)}
              onReviewFeedback={() => document.getElementById("ai-focus-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
          </section>
          <section className="space-y-2.5">
            <SectionLabel>Intelligence</SectionLabel>
            <AIFocusCard entries={entries} accessToken={session?.access_token} />
          </section>
          <section className="space-y-2.5">
            <SectionLabel>Journal</SectionLabel>
            <RecentTradesSection entries={entries} onExportCSV={exportCSV} onDelete={handleDeleteEntry} />
          </section>
          <section className="space-y-2.5">
            <SectionLabel>Review</SectionLabel>
            {hasData && symbolStats.length > 0 && (
              <PerformanceBreakdownCard symbolStats={symbolStats} dayStats={dayStats} />
            )}
            <WeeklyReviewCard hasData={hasData} entries={entries} />
          </section>
        </div>

        <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
        <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} planId={logPlanId} prefill={logPrefill} onLogAnother={() => { setLogPlanId(undefined); setLogPrefill(undefined); }} />
        <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} userId={user?.id} />
        <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} userId={user?.id} />
      </>
    );
  }

  // ──── OS LAYOUT (feature flag ON) ────
  const vaultStatusDot = vaultState.vault_status === "GREEN"
    ? "bg-emerald-400" : vaultState.vault_status === "YELLOW"
    ? "bg-amber-400" : "bg-red-400";

  const showMetrics = startingBalance !== null || hasData;

  return (
    <>
      <div className="px-3 md:px-5 pb-6 max-w-7xl pt-2 space-y-1.5">

        {/* ══════ TRADE OS IDENTITY ══════ */}
        <div className="pt-4 pb-2 px-1">
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
            Trade OS
          </span>
          <h1 className="text-2xl md:text-[32px] font-bold text-foreground mt-2.5 tracking-tight leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
            Your Command Center
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {(["Plan", "Live", "Review", "Insights"] as const).map((stage, i) => {
              const isActive = activeStage === stage.toLowerCase();
              return (
                <span key={stage} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive
                        ? "text-primary font-semibold"
                        : "text-muted-foreground/40"
                    )}
                    style={isActive ? { textShadow: "0 0 10px hsl(var(--primary) / 0.5)" } : undefined}
                  >
                    {stage}
                  </span>
                  {i < 3 && <span className="text-muted-foreground/20 text-xs">→</span>}
                </span>
              );
            })}
          </div>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        </div>

        {/* ══════ WELCOME HERO ══════ */}
        {showMetrics && (
          <div className="vault-os-card p-4 md:p-5" style={{ background: "radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.06), transparent 70%), hsl(var(--card))" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60 font-semibold">Your Trading Day</p>
                <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl font-bold tabular-nums text-foreground tracking-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                      {trackedBalance !== null ? `$${trackedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
                    </span>
                    {todayPnl !== 0 && (
                      <span className={cn(
                        "text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full",
                        todayPnl > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                          : "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                      )}>
                        {todayPnl > 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(0)} today
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    {dayState === "day_complete" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <span className={cn("w-[5px] h-[5px] rounded-full", vaultStatusDot, dayState === "live_session" && "animate-pulse")} />
                    )}
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
                      {dayStateStatus}
                    </span>
                  </div>
                </div>
                {/* Yesterday recap + rolling stats */}
                {(() => {
                  const yesterdayDate = new Date();
                  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
                  const yesterdayEntries = entries.filter((e) => e.trade_date === yesterdayStr);
                  const yesterdayPnl = yesterdayEntries.reduce((s, e) => s + computePnl(e), 0);
                  const isATH = trackedBalance !== null && allTimeHigh > 0 && trackedBalance >= allTimeHigh && entries.length > 1;
                  return (
                    <>
                      {isATH && (
                        <span className="vault-ath-shimmer inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.12)]">
                          ★ New Personal Best
                        </span>
                      )}
                      {entries.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                          <span className="text-foreground/70">Yesterday: {yesterdayEntries.length > 0
                            ? <><span className={yesterdayPnl >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{yesterdayPnl >= 0 ? "+" : "-"}${Math.abs(yesterdayPnl).toFixed(0)}</span> · {yesterdayEntries.length} trade{yesterdayEntries.length !== 1 ? "s" : ""}</>
                            : <span className="text-foreground/50">No trades</span>}
                          </span>
                          {entries.length >= 3 && (
                            <>
                              <span className="text-foreground/30">·</span>
                              <span className="text-foreground/70">Win rate <span className="text-foreground font-semibold">{last10WinRate}%</span></span>
                              <span className="text-foreground/30">·</span>
                              <span className="text-foreground/70">Rules <span className="text-foreground font-semibold">{weeklyComplianceRate}%</span></span>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* Luminous divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent mt-2 mb-0.5" />
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-foreground/60 font-medium">
                    {todayTradeCount}/{totalMaxTrades} trades left
                  </span>
                  <span className="text-[10px] text-foreground/20">·</span>
                  {(() => {
                    const hudBal = trackedBalance ?? vaultState.account_balance;
                    const hudTier = detectTier(hudBal);
                    const hudRisk = hudBal * (TIER_DEFAULTS[hudTier].riskPercent / 100);
                    return (
                      <span className={cn("text-[10px] font-semibold tabular-nums", hudRisk <= 0 ? "text-red-400" : "text-foreground/60")}>
                        ${hudRisk.toFixed(0)} max loss today
                      </span>
                    );
                  })()}
                </div>
              </div>
              {/* Compliance Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-12 h-12">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted) / 0.15)" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 - (weeklyComplianceRate / 100) * 2 * Math.PI * 20}
                      className="transition-all duration-500"
                      style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.4))" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-block text-sm font-bold leading-none tabular-nums text-foreground translate-x-[1px]">{weeklyComplianceRate}%</span>
                  </div>
                </div>
                <span className="text-[8px] text-foreground/60 font-medium mt-0.5">This week</span>
              </div>
            </div>
          </div>
        )}

        {/* Balance skip reminder */}
        {balanceSkipped && startingBalance === null && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[11px] text-foreground font-medium flex-1 min-w-0">Starting balance not set</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[10px] h-6 px-2.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full" onClick={() => setShowBalanceModal(true)}>Set Now</Button>
          </div>
        )}

        {!hasData && (
          <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
        )}

        {/* ══════ FLEX WRAPPER: Left Rail + Main ══════ */}
        <div className="flex gap-4">

        {/* ══════ LEFT GUIDE RAIL — desktop only ══════ */}
        <div className="hidden lg:block w-[220px] shrink-0">
          <div className="sticky top-20">
            <OSControlRail
              activePlan={activePlan}
              trackedBalance={trackedBalance}
              vaultAccountBalance={vaultState.account_balance}
              todayTradeCount={todayTradeCount}
              maxTradesPerDay={vaultState.max_trades_per_day}
              vaultStatus={vaultState.vault_status}
              lastBlockReason={vaultState.last_block_reason}
              dayState={dayState}
              dayStateStatus={dayStateStatus}
              dayStateCta={dayStateCta}
              onQuickAction={handleQuickAction}
              onLogFromPlan={handleLogFromPlan}
              activeStage={activeStage}
              stageStatus={stageStatus}
              onSelectStage={setStage}
            />
          </div>
        </div>

        {/* ══════ MAIN CONTENT ══════ */}
        <div className="flex-1 min-w-0 space-y-1.5">

        {/* ══════ HERO OS CARD ══════ */}
        <div className="vault-os-card overflow-hidden">
          {/* Tabs */}
          <OSTabHeader activeStage={activeStage} stageStatus={stageStatus} onSelect={setStage} />

          {/* Two-column body */}
          <div className="flex flex-col md:flex-row">
            {/* ── LEFT MAIN ZONE ── */}
            <div className="flex-[3] min-w-0 px-2.5 pb-2.5">

              {/* PLAN STAGE */}
              {activeStage === "plan" && (
                <div className="space-y-2">
                  <StageHeadline stage="plan" />

                  {/* ═══ TODAY'S BUDGET — collapsible summary ═══ */}
                  {(() => {
                    const bal = trackedBalance ?? vaultState.account_balance;
                    const tier = detectTier(bal);
                    const defaults = TIER_DEFAULTS[tier];
                    const riskBudget = bal * (defaults.riskPercent / 100);
                    const positionCap = bal * (defaults.preferredSpendPercent / 100);
                    return (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition-colors">
                          <span className="text-[10px] font-semibold text-foreground/70 flex-1 text-left">
                            ${riskBudget.toFixed(0)} max loss · ${positionCap.toFixed(0)} max spend · {MAX_LOSSES_PER_DAY} trades
                          </span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <TooltipProvider delayDuration={200}>
                          <div className="pt-2 pb-1 px-0.5">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="text-center">
                                <p className="text-lg font-bold tabular-nums text-foreground">${riskBudget.toFixed(0)}</p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[9px] text-foreground/50 font-medium inline-flex items-center gap-0.5 cursor-help">Max Loss <HelpCircle className="h-2.5 w-2.5" /></p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[180px] text-xs">The most you should lose today across all trades. Based on your balance and tier.</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold tabular-nums text-foreground">${positionCap.toFixed(0)}</p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[9px] text-foreground/50 font-medium inline-flex items-center gap-0.5 cursor-help">Max Spend <HelpCircle className="h-2.5 w-2.5" /></p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[180px] text-xs">The max dollar amount you should spend on a single options position.</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold tabular-nums text-foreground">{MAX_LOSSES_PER_DAY}</p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[9px] text-foreground/50 font-medium inline-flex items-center gap-0.5 cursor-help">Max Trades <HelpCircle className="h-2.5 w-2.5" /></p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[180px] text-xs">How many losing trades you're allowed before the system locks you out for the day.</TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold tabular-nums text-foreground">{computeVaultLimits(bal, vaultState.risk_mode || "STANDARD").max_contracts}</p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-[9px] text-foreground/50 font-medium inline-flex items-center gap-0.5 cursor-help">Max Size <HelpCircle className="h-2.5 w-2.5" /></p>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[180px] text-xs">The most contracts you can hold in one position based on your risk budget.</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground/50 text-center mt-2">
                              ${bal.toLocaleString()} · {tier} tier · {defaults.riskPercent}% risk
                            </p>
                          </div>
                          </TooltipProvider>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })()}

                  {activePlan && activePlan.status === "planned" && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-xs font-bold text-foreground">{activePlan.ticker || "—"}</span>
                          <span className="text-[10px] text-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground/50" onClick={() => handleCancelPlan(activePlan.id)}>Cancel</Button>
                      </div>
                      <p className="text-[10px] text-foreground/60 pl-3">
                        Max risk: ${Number(activePlan.max_loss_planned).toFixed(0)} · Entry: ${Number(activePlan.entry_price_planned).toFixed(2)}
                      </p>
                      <Button size="sm" className="w-full h-8 text-[11px] gap-1 rounded-lg font-semibold" onClick={() => { setStage("live"); }}>
                        <Radio className="h-3 w-3" /> Start Session
                      </Button>
                    </div>
                  )}
                  {!activePlan && todayStatus !== "complete" && dayState === "no_plan" && (
                    <div ref={plannerRef}>
                      <VaultTradePlanner
                        balanceOverride={trackedBalance}
                        activePlanOverride={activePlan}
                        savePlanOverride={undefined}
                        replaceWithNewOverride={undefined}
                        onPlanSaved={refetchPlan}
                        embedded
                      />
                    </div>
                  )}
                  {todayStatus === "complete" && (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <p className="text-xs text-muted-foreground/60 font-medium">✓ Today's session is done. Come back tomorrow.</p>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE STAGE */}
              {activeStage === "live" && (
                <div className="space-y-2">
                  {/* ── Live Status Bar ── */}
                  {(() => {
                    const hudBal = trackedBalance ?? vaultState.account_balance;
                    const hudTier = detectTier(hudBal);
                    const hudRisk = hudBal * (TIER_DEFAULTS[hudTier].riskPercent / 100);
                    const vaultDotColor = vaultState.vault_status === "GREEN" ? "bg-emerald-400" : vaultState.vault_status === "YELLOW" ? "bg-amber-400" : "bg-red-400";
                    return (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                        <span className={cn("w-2 h-2 rounded-full animate-pulse shrink-0", vaultDotColor)} />
                        <span className="text-[11px] font-bold text-foreground">LIVE</span>
                        {activePlan && <span className="text-[10px] text-muted-foreground/60">· {activePlan.ticker} {activePlan.direction === "calls" ? "Calls" : "Puts"} {activePlan.contracts_planned}ct</span>}
                        <span className="text-[10px] text-foreground/60 ml-auto tabular-nums">{todayTradeCount}/{totalMaxTrades} trades · ${hudRisk.toFixed(0)} left</span>
                      </div>
                    );
                  })()}

                  {/* ── Cockpit: Plan card ── */}
                  {activePlan && activePlan.status === "planned" ? (
                    <div className={cn("rounded-lg p-2 space-y-1.5 border-l-[3px]",
                      vaultState.vault_status === "GREEN" ? "border-l-emerald-400 border border-emerald-500/20 bg-emerald-500/[0.05]" :
                      vaultState.vault_status === "YELLOW" ? "border-l-amber-400 border border-amber-500/20 bg-amber-500/[0.05]" :
                      "border-l-red-400 border border-red-500/20 bg-red-500/[0.05]"
                    )}>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.5)]", executing ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-pulse")} />
                        <span className="text-sm font-bold text-foreground">{activePlan.ticker || "—"}</span>
                        <span className="text-[10px] text-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct · ${Number(activePlan.entry_price_planned).toFixed(2)}</span>
                        <span className={cn("ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          executing
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {executing ? "Executing" : "Planned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pl-3.5">
                        <SessionCountdownLine />
                        <span className="text-[10px] text-foreground/30">·</span>
                        <span className="text-[10px] text-foreground/60 tabular-nums">{todayTradeCount}/{totalMaxTrades} trades</span>
                        {executing && executionStart && (
                          <>
                            <span className="text-[10px] text-foreground/30">·</span>
                            <span className="text-[10px] text-foreground/60 tabular-nums font-mono">{fmtExecTime(execElapsed)}</span>
                          </>
                        )}
                      </div>

                      {!executing ? (
                        <Button size="sm" className="h-8 text-[11px] gap-1 rounded-lg px-3 w-full font-semibold" onClick={handleMarkExecuting} disabled={isCutoffOrClosed && !cutoffOverride}>
                          <Zap className="h-3 w-3" /> Mark Executing
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className={cn("h-8 text-[11px] gap-1 rounded-lg px-3 w-full font-semibold",
                            isCutoffOrClosed && "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          )}
                          variant={isCutoffOrClosed ? "outline" : "default"}
                          onClick={() => handleLogWithCutoffCheck(activePlan)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {isCutoffOrClosed ? "Override: Log After Cutoff" : "Close & Log Result"}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.08] bg-white/[0.02]">
                      <SessionCountdownLine className="flex-1" />
                      <span className="text-[10px] text-foreground/50 tabular-nums">{todayTradeCount}/{totalMaxTrades}</span>
                      <Button size="sm" className="gap-1 rounded-md px-2.5 h-7 text-[10px]" onClick={() => setStage("plan")}>
                        <Calendar className="h-3 w-3" /> Plan
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 rounded-md px-2.5 h-7 text-[10px] border-white/[0.08]" onClick={() => handleLogWithCutoffCheck()}>
                        <Plus className="h-3 w-3" /> Log
                      </Button>
                    </div>
                  )}

                  {sessionPhase === "No new entries" && !dismissedBanner && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <p className="text-xs font-bold text-amber-400 flex-1">Cutoff reached</p>
                        <button onClick={() => setDismissedBanner(true)} className="text-amber-400/50 hover:text-amber-400 transition-colors p-0.5"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <p className="text-[11px] text-muted-foreground/60 pl-6">No new entries allowed. Review your session or override if needed.</p>
                    </div>
                  )}
                  {sessionPhase === "Session closed" && !dismissedBanner && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-xs font-bold text-red-400 flex-1">Session closed</p>
                        <button onClick={() => setDismissedBanner(true)} className="text-red-400/50 hover:text-red-400 transition-colors p-0.5"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <Button size="sm" className="w-full h-8 text-[11px] gap-1 rounded-lg font-semibold ml-0" onClick={() => setStage("review")}>
                        <ClipboardCheck className="h-3 w-3" /> Complete Review Now
                      </Button>
                    </div>
                  )}

                  {todayTradeCount > 0 && todayStatus !== "complete" && (
                    <Button size="sm" className="w-full h-8 text-[11px] gap-1 rounded-lg font-semibold" onClick={() => setStage("review")}>
                      <ClipboardCheck className="h-3 w-3" /> Complete Review
                    </Button>
                  )}

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-foreground/40 hover:text-foreground/60 transition-colors font-medium w-full py-1">
                      <ChevronDown className="h-3 w-3" /> Session Details
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-1">
                      <SessionSetupCard onPhaseChange={setSessionPhase} />
                      <TodaysLimitsSection balanceOverride={trackedBalance ?? undefined} />
                      {sessionPhase && (
                        <button
                          onClick={() => setStage("review")}
                          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold border border-red-500/20 bg-red-500/[0.08] text-red-400 hover:bg-red-500/15 transition-colors"
                        >
                          <Square className="h-3 w-3" /> End Session
                        </button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {/* REVIEW STAGE */}
              {activeStage === "review" && (
                <div className="space-y-2">
                  <StageHeadline stage="review" />
                  {entries.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-xs text-muted-foreground/60">No trades logged yet.</p>
                      <Button size="sm" className="gap-1 rounded-lg px-3 h-8 text-[11px]" onClick={handleLogUnplanned}>
                        <Plus className="h-3 w-3" /> Log a Trade
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Session Summary */}
                      {todayTradeCount > 0 && (
                        <div className="flex items-center divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] overflow-hidden">
                          <div className="flex-1 px-2.5 py-1.5">
                            <p className="text-[9px] text-muted-foreground/60 font-medium mb-0.5">Trades Today</p>
                            <p className="text-sm font-semibold tabular-nums text-foreground">{todayTradeCount}</p>
                          </div>
                          <div className="flex-1 px-2.5 py-1.5">
                            <p className="text-[9px] text-muted-foreground/60 font-medium mb-0.5">P/L</p>
                            <p className={cn("text-sm font-semibold tabular-nums", todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-foreground")}>
                              {todayPnl >= 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(0)}
                            </p>
                          </div>
                          <div className="flex-1 px-2.5 py-1.5">
                            <p className="text-[9px] text-muted-foreground/60 font-medium mb-0.5">Rules</p>
                            <p className={cn("text-sm font-semibold tabular-nums", todayCompliance === 100 ? "text-emerald-400" : "text-amber-400")}>{todayCompliance}%</p>
                          </div>
                        </div>
                      )}

                      {/* Today's Plan History */}
                      {todayPlans.length > 0 && (
                        <div>
                          <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase mb-1.5">
                            Plans ({todayPlans.length})
                          </p>
                          <div className="space-y-0.5 rounded-lg border border-white/[0.08] overflow-hidden">
                            {todayPlans.map(p => {
                              const statusColor = p.status === "planned" ? "text-primary" : p.status === "logged" ? "text-emerald-400" : "text-muted-foreground/40";
                              const statusDot = p.status === "planned" ? "bg-primary" : p.status === "logged" ? "bg-emerald-400" : "bg-muted-foreground/30";
                              return (
                                <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors">
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot)} />
                                  <span className="text-xs font-semibold text-foreground min-w-[36px]">{p.ticker || "—"}</span>
                          <span className="text-[10px] text-muted-foreground/60 flex-1 truncate">
                                    {p.direction === "calls" ? "Calls" : "Puts"} · {p.contracts_planned}ct · ${Number(p.max_loss_planned).toFixed(0)} risk
                                  </span>
                                  <span className={cn("text-[10px] font-semibold capitalize", statusColor)}>{p.status}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {todayStatus !== "complete" && (
                        <div className="flex flex-col gap-1.5">
                          <Button
                            variant="outline"
                            className="w-full h-9 gap-1.5 rounded-lg text-xs font-semibold border-white/[0.08]"
                            onClick={handleLogUnplanned}
                          >
                            <Plus className="h-3.5 w-3.5" /> Log Another Trade
                          </Button>
                          <Button
                            className="w-full h-9 gap-1.5 rounded-lg text-xs font-semibold"
                            onClick={() => setShowCheckIn(true)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Complete Review
                          </Button>
                        </div>
                      )}

                      {todayTradeCount === 0 && todayStatus !== "complete" && !noTradeDay && (
                        <Button
                          variant="ghost"
                          className="w-full h-8 gap-1.5 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground"
                          onClick={() => setShowNoTradeDay(true)}
                        >
                          <CalendarOff className="h-3.5 w-3.5" /> Mark No-Trade Day
                        </Button>
                      )}

                      <div>
                        <p className="text-[10px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase mb-1.5">
                          {todayTradeCount > 0 ? `Today (${todayTradeCount})` : "Recent"}
                        </p>
                        <div className="space-y-0.5 rounded-lg border border-white/[0.08] overflow-hidden">
                          {(todayTradeCount > 0 ? todayEntries : recentFive).map(e => {
                            const pnl = computePnl(e);
                            const isWin = e.risk_reward > 0;
                            const isLoss = e.risk_reward < 0;
                            return (
                              <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isWin ? "bg-emerald-400" : isLoss ? "bg-red-400" : "bg-muted-foreground/20")} />
                                <span className="text-xs font-semibold text-foreground min-w-[36px]">{e.symbol || "—"}</span>
                                <span className="text-[10px] text-muted-foreground/60 flex-1 truncate">{e.outcome || "—"} {e.followed_rules ? "✓" : "✗"}</span>
                                <span className={cn("text-xs font-semibold tabular-nums", isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-muted-foreground/40")}>
                                  {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {todayStatus === "complete" && (
                        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                          <p className="text-xs text-emerald-400/80 font-medium flex-1">Session complete. See what AI found.</p>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 px-2" onClick={() => setStage("insights")}>
                            <Brain className="h-3 w-3 mr-1" /> Insights
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* INSIGHTS STAGE */}
              {activeStage === "insights" && (
                <div className="space-y-2">
                  <StageHeadline stage="insights" />
                  {entries.length < 3 ? (
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 text-center">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 mx-auto">
                        <Lock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">AI Insights unlock at 3 trades</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          Log {3 - entries.length} more trade{3 - entries.length !== 1 ? "s" : ""} to unlock personalized AI analysis of your risk behavior, leaks, and edges.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground/60 font-medium">{entries.length} / 3 trades</span>
                          <span className="text-primary font-semibold">{Math.round((entries.length / 3) * 100)}%</span>
                        </div>
                        <Progress value={(entries.length / 3) * 100} className="h-2" />
                      </div>
                      {/* #8: Beginner Insights — rule-based pre-AI stats */}
                      {entries.length >= 1 && (
                        <div className="text-left space-y-1.5 pt-2 border-t border-white/[0.06]">
                          <p className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Early Stats</p>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground/60">Rules followed</span>
                            <span className="text-foreground font-medium">{entries.filter(e => e.followed_rules).length}/{entries.length} trades</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground/60">Most traded</span>
                            <span className="text-foreground font-medium">{symbolStats[0]?.symbol || "—"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground/60">Avg P/L</span>
                            <span className={cn("font-medium", totalPnl / entries.length >= 0 ? "text-emerald-400" : "text-red-400")}>
                              {totalPnl / entries.length >= 0 ? "+" : "-"}${Math.abs(totalPnl / entries.length).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="gap-1 rounded-lg h-8 text-[11px] border-white/[0.08]" onClick={handleLogUnplanned}>
                        <Plus className="h-3 w-3" /> Log a Trade
                      </Button>
                    </div>
                  ) : (
                    <>
                      {cachedAI && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Grade */}
                          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
                            <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-1">Grade</p>
                            <p className={cn("text-2xl font-black",
                              cachedAI.riskGrade === "A" ? "text-emerald-400" :
                              cachedAI.riskGrade === "B" ? "text-primary" :
                              cachedAI.riskGrade === "C" ? "text-amber-400" : "text-red-400"
                            )}>
                              {cachedAI.riskGrade || "—"}
                            </p>
                            <p className="text-[10px] text-foreground/50 mt-0.5">
                              {cachedAI.riskGrade === "A" ? "Excellent risk discipline" : cachedAI.riskGrade === "B" ? "Good — minor improvements" : cachedAI.riskGrade === "C" ? "Needs work on risk" : "Critical risk issues"}
                            </p>
                          </div>

                          {/* Leak */}
                          <InsightMiniCard label="Leak" dotColor="bg-red-400/70" text={cachedAI.primaryLeak || "—"} />

                          {/* Edge */}
                          <InsightMiniCard label="Edge" dotColor="bg-emerald-400/70" text={cachedAI.strongestEdge || "—"} />

                          {/* Next */}
                          <InsightMiniCard label="Next" dotColor="bg-primary/70" text={cachedAI.nextAction || "—"} />
                        </div>
                      )}
                      <AIFocusCard entries={entries} accessToken={session?.access_token} />
                    </>
                  )}
                </div>
              )}
            </div>

           </div>

          {/* ── INTELLIGENCE STRIP ── */}
          {cachedAI && (
            <button
              onClick={() => setStage("insights")}
              className="w-full border-t border-white/[0.04] border-l-2 border-l-primary/30 hover:bg-white/[0.02] hover:-translate-y-px transition-all duration-100"
            >
              <div className="flex items-center gap-4 px-3 py-1.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.4)]" />
                  <span className="text-[9px] text-muted-foreground/40 font-medium">AI</span>
                </div>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div>
                    <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">Grade</p>
                    <p className={cn("text-xs font-bold",
                      cachedAI.riskGrade === "A" ? "text-emerald-400" :
                      cachedAI.riskGrade === "B" ? "text-primary" :
                      cachedAI.riskGrade === "C" ? "text-amber-400" : "text-red-400"
                    )}>
                      {cachedAI.riskGrade || "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">Leak</p>
                    <p className="text-[10px] font-semibold text-foreground/70 truncate">{cachedAI.primaryLeak || "—"}</p>
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">Edge</p>
                    <p className="text-[10px] font-semibold text-foreground/70 truncate">{cachedAI.strongestEdge || "—"}</p>
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <p className="text-[8px] text-muted-foreground/40 font-medium uppercase">Next</p>
                    <p className="text-[10px] font-semibold text-foreground/70 truncate">{cachedAI.nextAction || "—"}</p>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ══════ LOWER ANALYTICS ══════ */}
        {hasData && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-0.5">
              <BarChart3 className="h-3.5 w-3.5 text-primary/60" />
              <p className="text-[10px] tracking-[0.1em] font-semibold text-muted-foreground/60 uppercase">Analytics</p>
            </div>

            {/* Row 1: Equity Curve — full width */}
            {equityCurve.length > 1 && startingBalance !== null && (
              <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} adjustments={adjustments.map(a => ({ date: a.adjustment_date, amount: Number(a.amount) }))} winRate={allTimeWinRate} totalTrades={entries.length} />
            )}

            {/* Row 2: Performance Breakdown + Recent Trades */}
            <div className="grid gap-2 md:grid-cols-2">
              {symbolStats.length > 0 && (
                <PerformanceBreakdownCard symbolStats={symbolStats} dayStats={dayStats} />
              )}
              <RecentTradesSection entries={entries} onExportCSV={exportCSV} onDelete={handleDeleteEntry} compact />
            </div>

            {/* Row 3: Tracked Balance + Weekly Review */}
            <div className="grid gap-2 md:grid-cols-2">
              {trackedBalance !== null && (
                <BalanceAdjustmentCard
                  balance={trackedBalance}
                  onAddFunds={async (amt, note) => {
                    const ok = await addAdjustment(amt, note);
                    if (ok) {
                      toast({ title: "Funds added", description: `+$${amt.toLocaleString()} recorded.` });
                      refetchTrades();
                    }
                    return ok;
                  }}
                  onWithdraw={async (amt, note) => {
                    const ok = await addAdjustment(-amt, note);
                    if (ok) {
                      toast({ title: "Withdrawal recorded", description: `-$${amt.toLocaleString()} recorded.` });
                      refetchTrades();
                    }
                    return ok;
                  }}
                  onReset={async () => {
                    await handleResetBalance();
                    refetchTrades();
                  }}
                  onDeleteAdjustment={async (id) => {
                    const ok = await removeAdjustment(id);
                    if (ok) {
                      toast({ title: "Adjustment removed" });
                      refetchTrades();
                    }
                    return ok;
                  }}
                  adjustments={adjustments}
                  resetting={resetting}
                />
              )}
              <WeeklyReviewCard hasData={hasData} entries={entries} />
            </div>
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Mobile CTA Bar */}
      {isMobile && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-[env(safe-area-inset-bottom,0px)] flex justify-center">
          <Button
            className="w-full max-w-xs h-11 rounded-2xl text-sm font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_12px_rgba(59,130,246,0.15)] backdrop-blur-sm vault-cta-shine"
            onClick={handleQuickAction}
          >
            {dayStateCta}
          </Button>
        </div>
      )}

      {/* Modals */}
      <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} planId={logPlanId} prefill={logPrefill} onLogAnother={() => { setLogPlanId(undefined); setLogPrefill(undefined); }} />
      <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} userId={user?.id} />
      <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} userId={user?.id} />
      <CoachingNudgeModal open={showNudge} triggerType={nudge.triggerType} onDismiss={() => { setShowNudge(false); nudge.dismiss(); }} />

    </>
  );
};

export default AcademyTrade;
