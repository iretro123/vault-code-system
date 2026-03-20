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
import { useUserPreferences } from "@/hooks/useUserPreferences";

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
import { SessionSetupCard, SessionCountdownLine, loadTimes, clearSession, clearSessionFromDB } from "@/components/trade-os/SessionSetupCard";
import type { SessionTimes } from "@/components/trade-os/SessionSetupCard";
import type { SessionPhaseLabel } from "@/components/trade-os/SessionSetupCard";
import { Progress } from "@/components/ui/progress";
import { RewardTargetsStrip } from "@/components/trade-os/RewardTargetsStrip";
import { ContractFrameworkCard } from "@/components/trade-os/ContractFrameworkCard";
import { VaultStatusBadge } from "@/components/trade-os/VaultStatusBadge";
import { LiveSessionMetrics } from "@/components/trade-os/LiveSessionMetrics";
import { FocusReminderCards } from "@/components/trade-os/FocusReminderCards";
import { NYSESessionBar } from "@/components/trade-os/NYSESessionBar";
import { DisciplineMetricsStrip } from "@/components/trade-os/DisciplineMetricsStrip";

type TodayStatus = "incomplete" | "in_progress" | "complete";

const STAGE_HEADLINES: Record<string, { title: string; subtitle: string; emotional: string; guidance: string }> = {
  plan: {
    title: "Start Your Day",
    subtitle: "Install your risk rules before you trade.",
    emotional: "You know exactly what today looks like.",
    guidance: "Set your budget, direction, and session window. Lock in your rules to go live.",
  },
  live: {
    title: "Trade Your Session",
    subtitle: "Stay inside your rules.",
    emotional: "You're locked in.",
    guidance: "Your rules are locked. Trade your session window, then end and review.",
  },
  review: {
    title: "Session Review",
    subtitle: "Did you follow your plan?",
    emotional: "Tell the truth.",
    guidance: "Answer honestly, log your result, and close the day.",
  },
  insights: {
    title: "My Insights",
    subtitle: "AI-scanned behavior across your trades.",
    emotional: "Your OS is learning you.",
    guidance: "AI scans your last 50 trades for leaks, edges, and patterns.",
  },
};

function StageHeadline({ stage }: { stage: string }) {
  const h = STAGE_HEADLINES[stage];
  if (!h) return null;
  return (
    <div className="py-6 md:py-3 text-center space-y-1">
      <h2 className="text-2xl md:text-xl font-bold tracking-tight text-foreground" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>{h.title}</h2>
      <p className="text-sm text-foreground/50 font-medium">{h.emotional}</p>
      <div className="vault-divider-glow mx-auto w-2/3 mt-4 md:mt-2" />
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
  const { state: vaultState, refetch: vaultRefetch } = useVaultState();
  const { isAdminActive } = useAdminMode();
  
  const {
    entries, loading: tradesLoading, addEntry, deleteEntry, exportCSV, refetch: refetchTrades,
    allTimeWinRate, complianceRate, currentStreak, todayPnl, totalPnl, equityCurve, symbolStats, dayStats,
    last10WinRate, weeklyComplianceRate, bestStreak, allTimeHigh,
  } = useTradeLog();
  const { activePlan, todayPlans, loading: planLoading, cancelPlan, markLogged, savePlan, refetch: refetchPlan } = useApprovedPlans();
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
  const [localDirection, setLocalDirection] = useState<"calls" | "puts">("calls");
  const [localTicker, setLocalTicker] = useState("");
  const [savingRules, setSavingRules] = useState(false);

  const nudge = useCoachingNudge({ entries, totalPnl, startingBalance: startingBalance ?? 0, complianceRate });
  const { prefs, updatePrefs } = useUserPreferences();

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

    // Auto-advance: if in review stage, auto-open check-in after brief delay
    if (activeStage === "review") {
      setTimeout(() => {
        setShowLogTrade(false);
        setTimeout(() => setShowCheckIn(true), 400);
      }, 800);
    }

    // Smart coaching nudge — show after 1.5s if conditions met
    if (nudge.shouldShow && activeStage !== "review") {
      setTimeout(() => setShowNudge(true), 1500);
    }
  };

  const handleLogFromPlan = (plan: ApprovedPlan) => {
    const isRiskOnly = plan.entry_price_planned === 0;
    setLogPlanId(plan.id);
    setLogPrefill({
      symbol: plan.ticker || "",
      direction: plan.direction === "calls" ? "Calls" : "Puts",
      ...(isRiskOnly ? {} : {
        entryPrice: String(plan.entry_price_planned),
        positionSize: String(plan.contracts_planned),
      }),
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

  const handleCheckInComplete = () => { setShowCheckIn(false); setTodayStatus("complete"); toast({ title: "Check-in complete", description: "AI review is ready for this session." }); setTimeout(() => setStage("insights"), 600); };
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
      case "no_plan": setStage("plan"); break;
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

        {/* ══════ TRADE OS IDENTITY — CENTERED ══════ */}
        <div className="pt-5 pb-1 flex flex-col items-center text-center">
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.18em] text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
            Trade OS
          </span>
          <h1 className="text-2xl md:text-[28px] font-bold text-foreground mt-2 tracking-tight leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
            Trade OS
          </h1>
          <p className="text-[11px] text-muted-foreground/50 font-medium mt-1 tracking-wide">Your center of operations</p>
        </div>

        {/* ══════ STATUS STRIP ══════ */}
        {showMetrics && (
          <div className="flex items-center justify-center gap-3 py-1.5">
            <div className="flex items-center gap-1.5">
              {dayState === "day_complete" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <span className={cn("w-[5px] h-[5px] rounded-full", vaultStatusDot, dayState === "live_session" && "animate-pulse")} />
              )}
              <span className="text-[11px] text-muted-foreground/70 font-medium">
                {dayStateStatus}
              </span>
            </div>
            {todayPnl !== 0 && (
              <>
                <span className="text-muted-foreground/20 text-xs">·</span>
                <span className={cn(
                  "text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full",
                  todayPnl > 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {todayPnl > 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(0)} today
                </span>
              </>
            )}
            {trackedBalance !== null && allTimeHigh > 0 && trackedBalance >= allTimeHigh && entries.length > 1 && (
              <>
                <span className="text-muted-foreground/20 text-xs">·</span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                  ★ ATH
                </span>
              </>
            )}
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

        {/* ══════ HERO OS CARD ══════ */}
        <div className="vault-os-card overflow-hidden">
          <div className="flex">
            {/* ── LEFT GUIDE RAIL (inside card) ── */}
            <div className="hidden lg:block w-[240px] shrink-0 border-r border-white/[0.06]">
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

            {/* ── RIGHT: Tabs + Content ── */}
            <div className="flex-1 min-w-0">
          {/* Tabs */}
          <OSTabHeader activeStage={activeStage} stageStatus={stageStatus} onSelect={setStage} />

          {/* Content body */}
          <div className="px-2.5 pb-2.5">

              {/* START YOUR DAY STAGE */}
              {activeStage === "plan" && (
                <div className="space-y-2.5">
                  <StageHeadline stage="plan" />

                  {todayStatus === "complete" ? (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <p className="text-xs text-muted-foreground/60 font-medium">✓ Today's session is done. Come back tomorrow.</p>
                    </div>
                  ) : activePlan && activePlan.status === "planned" ? (
                    /* Active plan exists — show risk rules summary + go live CTA */
                    <div className="space-y-2.5">
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="text-xs font-bold text-foreground">Rules Locked</span>
                            {activePlan.ticker && <span className="text-[10px] text-foreground/60">· {activePlan.ticker}</span>}
                            <span className="text-[10px] text-foreground/60">· {activePlan.direction === "calls" ? "Calls" : "Puts"}</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-muted-foreground/50" onClick={() => handleCancelPlan(activePlan.id)}>Cancel</Button>
                        </div>
                        <p className="text-[10px] text-foreground/60 pl-3">
                          Max risk: ${Number(activePlan.max_loss_planned).toFixed(0)} · Max spend: ${Number(activePlan.cash_needed_planned).toFixed(0)}
                        </p>
                        <Button size="sm" className="w-full h-9 text-[11px] gap-1.5 rounded-lg font-semibold" onClick={() => { setStage("live"); }}>
                          <Radio className="h-3.5 w-3.5" /> Let's Start Live Trading
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* No active plan — show daily risk setup ritual */
                    (() => {
                      const bal = trackedBalance ?? vaultState.account_balance;
                      const tier = detectTier(bal);
                      const defaults = TIER_DEFAULTS[tier];
                      const effectiveRisk = (prefs?.risk_percent_override != null && prefs.risk_percent_override >= 1 && prefs.risk_percent_override <= 3) ? prefs.risk_percent_override : defaults.riskPercent;
                      const riskBudget = bal * (effectiveRisk / 100);
                      const positionCap = bal * (defaults.preferredSpendPercent / 100);
                      const vaultLimits = computeVaultLimits(bal, vaultState.risk_mode || "STANDARD");

                      const handleLockRules = async () => {
                        setSavingRules(true);
                        try {
                          const { error } = await savePlan({
                            ticker: localTicker || undefined,
                            direction: localDirection,
                            entry_price_planned: 0,
                            contracts_planned: 0,
                            stop_price_planned: null,
                            max_loss_planned: riskBudget,
                            cash_needed_planned: positionCap,
                            approval_status: "auto_approved",
                            account_balance_snapshot: bal,
                            trade_loss_limit_snapshot: riskBudget,
                            account_level_snapshot: tier,
                          });
                          if (error) throw error;
                          refetchPlan();
                          setTimeout(() => setStage("live"), 300);
                        } catch {
                          toast({ title: "Failed to lock rules", variant: "destructive" });
                        } finally { setSavingRules(false); }
                      };

                      return (
                        <div className="space-y-4 vault-stage-enter">
                          {/* ═══ HERO RISK CARD ═══ */}
                          <div className={cn(
                            "vault-luxury-card py-6 px-5 md:py-3 md:px-3 space-y-5 md:space-y-2",
                            effectiveRisk === 1 ? "ring-1 ring-emerald-500/15 shadow-[0_0_20px_hsla(160,84%,39%,0.06)]" :
                            effectiveRisk === 2 ? "ring-1 ring-amber-500/15 shadow-[0_0_20px_hsla(38,92%,50%,0.06)]" :
                            effectiveRisk === 3 ? "ring-1 ring-rose-500/15 shadow-[0_0_20px_hsla(0,72%,51%,0.06)]" : ""
                          )}>
                            {/* Balance + Update */}
                            <div className="relative z-10 flex items-center justify-between">
                              <div>
                                <p className="text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-[0.12em]">Account Balance</p>
                                <p className="text-4xl md:text-2xl font-bold tabular-nums text-foreground tracking-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                                  ${bal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg border-white/[0.08] text-muted-foreground/60" onClick={() => setShowBalanceModal(true)}>
                                <Wallet className="h-3 w-3 mr-1" /> Update
                              </Button>
                            </div>

                            {/* Risk % Selector */}
                            <div className="relative z-10 flex items-center justify-center gap-1 pt-1">
                              <span className="text-[9px] text-muted-foreground/40 font-medium mr-1.5">Risk</span>
                              {[1, 2, 3].map((pct) => (
                                <button
                                  key={pct}
                                  onClick={() => updatePrefs({ risk_percent_override: pct })}
                                  className={cn(
                                    "h-7 w-12 md:h-5 md:w-9 md:text-[10px] rounded-lg text-[11px] font-semibold transition-all duration-100",
                                    effectiveRisk === pct
                                      ? {
                                          1: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_hsla(160,84%,39%,0.12)]",
                                          2: "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_8px_hsla(38,92%,50%,0.12)]",
                                          3: "bg-rose-500/15 text-rose-400 border border-rose-500/25 shadow-[0_0_8px_hsla(0,72%,51%,0.12)]",
                                        }[pct]
                                      : "bg-white/[0.03] text-muted-foreground/50 border border-white/[0.06] hover:bg-white/[0.06]"
                                  )}
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>

                            {/* 2×2 Core Metrics */}
                            <TooltipProvider delayDuration={200}>
                              <div className="relative z-10 grid grid-cols-2 gap-2 md:gap-1.5">
                                <div className="vault-metric-cell">
                                  <p className="text-xl md:text-base font-bold tabular-nums text-foreground">${riskBudget.toFixed(0)}</p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5 inline-flex items-center gap-0.5 cursor-help">Max Daily Loss <HelpCircle className="h-2.5 w-2.5" /></p>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[180px] text-xs">The most you should lose today across all trades.</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="vault-metric-cell">
                                  <p className="text-xl md:text-base font-bold tabular-nums text-foreground">${(riskBudget / MAX_LOSSES_PER_DAY).toFixed(0)}</p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5 inline-flex items-center gap-0.5 cursor-help">Risk Per Trade <HelpCircle className="h-2.5 w-2.5" /></p>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[180px] text-xs">Max risk on any single trade.</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="vault-metric-cell">
                                  <p className="text-xl md:text-base font-bold tabular-nums text-foreground">{vaultLimits.max_contracts}</p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5 inline-flex items-center gap-0.5 cursor-help">Max Contracts <HelpCircle className="h-2.5 w-2.5" /></p>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[180px] text-xs">Max contracts per position.</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="vault-metric-cell">
                                  <p className="text-xl md:text-base font-bold tabular-nums text-foreground">{MAX_LOSSES_PER_DAY}</p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase tracking-wider mt-0.5 inline-flex items-center gap-0.5 cursor-help">Max Trades <HelpCircle className="h-2.5 w-2.5" /></p>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[180px] text-xs">Max losing trades before lockout.</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </TooltipProvider>

                            {/* Direction + Ticker — inside hero card */}
                            <div className="relative z-10 flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                              <div className="flex gap-1">
                                {(["calls", "puts"] as const).map((dir) => (
                                  <button
                                    key={dir}
                                    onClick={() => setLocalDirection(dir)}
                                    className={cn(
                                      "h-8 px-4 md:h-6 md:px-2.5 rounded-lg text-[11px] font-semibold transition-all duration-100",
                                      localDirection === dir
                                        ? dir === "calls"
                                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                          : "bg-red-500/15 text-red-400 border border-red-500/25"
                                        : "bg-white/[0.03] text-muted-foreground/50 border border-white/[0.06] hover:bg-white/[0.06]"
                                    )}
                                  >
                                    {dir === "calls" ? "Calls" : "Puts"}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="SPY, QQQ..."
                                value={localTicker}
                                onChange={(e) => setLocalTicker(e.target.value.toUpperCase())}
                                className="flex-1 h-8 md:h-6 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30"
                              />
                            </div>
                          </div>

                          {/* ═══ COLLAPSIBLE: Session & Targets ═══ */}
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center justify-between w-full rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors group">
                              <div className="flex items-center gap-2">
                                <Target className="h-3.5 w-3.5 text-primary/50" />
                                <span className="text-[11px] font-semibold text-foreground/70">Reward Targets</span>
                              </div>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30 transition-transform group-data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                              <RewardTargetsStrip riskPerTrade={riskBudget / MAX_LOSSES_PER_DAY} />
                            </CollapsibleContent>
                          </Collapsible>

                          {/* ═══ COLLAPSIBLE: Contract Framework ═══ */}
                          <ContractFrameworkCard
                            accountBalance={bal}
                            riskPerTrade={riskBudget / MAX_LOSSES_PER_DAY}
                            direction={localDirection}
                          />

                          {/* ═══ LOCK IN CTA ═══ */}
                          <div className="mt-6 md:mt-4 space-y-2">
                            <div className="vault-divider-glow mx-auto w-1/2" />
                            <Button
                              className={cn(
                                "w-full h-14 md:h-10 text-sm font-bold rounded-xl gap-2 vault-cta-shine shadow-[0_4px_24px_hsla(217,91%,60%,0.2)]",
                                savingRules && "vault-armed-flash bg-emerald-600 hover:bg-emerald-600"
                              )}
                              onClick={handleLockRules}
                              disabled={savingRules}
                            >
                              <Shield className="h-4 w-4" />
                              {savingRules ? "Rules Locked ✓" : "Lock In Today's Rules"}
                            </Button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* GO LIVE STAGE */}
              {activeStage === "live" && (
                <div className={cn("space-y-4", !isMobile && "vault-launch-streak vault-stage-enter")}>

                  {/* ═══ HERO HEADER: Vault Status ═══ */}
                  <div className={cn(
                    "vault-hero-glow rounded-2xl py-8 md:py-4 px-5",
                    vaultState.vault_status === "GREEN" ? "vault-hero-glow--green" : 
                    vaultState.vault_status === "YELLOW" ? "vault-hero-glow--amber" : "vault-hero-glow--red"
                  )}
                    style={{
                      background: `radial-gradient(ellipse 90% 120px at 50% 0%, ${
                        vaultState.vault_status === "GREEN" ? "hsla(160,84%,39%,0.06)" :
                        vaultState.vault_status === "YELLOW" ? "hsla(38,92%,50%,0.06)" :
                        "hsla(0,72%,51%,0.06)"
                      }, transparent 70%), hsl(214,24%,11%)`,
                      border: "1px solid hsla(0,0%,100%,0.05)",
                      borderRadius: "16px",
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center text-center space-y-3 md:space-y-2">
                      <div className={cn(
                        "flex items-center justify-center w-14 h-14 md:w-8 md:h-8 rounded-2xl md:rounded-xl border",
                        vaultState.vault_status === "GREEN" ? "bg-emerald-500/[0.08] border-emerald-500/20" :
                        vaultState.vault_status === "YELLOW" ? "bg-amber-500/[0.08] border-amber-500/20" :
                        "bg-red-500/[0.08] border-red-500/20"
                      )}>
                        <Shield className={cn("h-7 w-7 md:h-4 md:w-4",
                          vaultState.vault_status === "GREEN" ? "text-emerald-400" :
                          vaultState.vault_status === "YELLOW" ? "text-amber-400" : "text-red-400"
                        )} />
                      </div>
                      <div>
                        <p className={cn("text-3xl md:text-xl font-black tracking-tight",
                          vaultState.vault_status === "GREEN" ? "text-emerald-400" :
                          vaultState.vault_status === "YELLOW" ? "text-amber-400" : "text-red-400"
                        )} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
                          {vaultState.vault_status === "GREEN" ? "Vault Clear" : vaultState.vault_status === "YELLOW" ? "Vault Caution" : "Vault Locked"}
                        </p>
                        <p className="text-sm text-foreground/50 font-medium mt-2">Trade your session. Stay inside your rules.</p>
                      </div>
                    </div>
                  </div>

                  {/* ═══ NYSE SESSION BAR ═══ */}
                  <NYSESessionBar className="my-1" />

                  {/* ═══ THREE MAJOR CARDS ═══ */}
                  <div className="grid gap-2.5 md:gap-2 md:grid-cols-3 mt-2">

                    {/* Card 1: Your Limits */}
                    {(() => {
                      const bal = trackedBalance ?? vaultState.account_balance;
                      const tier = detectTier(bal);
                      const defaults = TIER_DEFAULTS[tier];
                      const effectiveRisk = (prefs?.risk_percent_override != null && prefs.risk_percent_override >= 1 && prefs.risk_percent_override <= 3) ? prefs.risk_percent_override : defaults.riskPercent;
                      const riskBudget = bal * (effectiveRisk / 100);
                      const vaultLimits = computeVaultLimits(bal, vaultState.risk_mode || "STANDARD");
                      return (
                        <div className="vault-obsidian-surface p-4 md:p-2.5 space-y-2">
                          <LiveSessionMetrics
                            variant="compact"
                            dailyLossBuffer={vaultState.risk_remaining_today ?? riskBudget}
                            riskPerTrade={riskBudget / MAX_LOSSES_PER_DAY}
                            maxContracts={vaultLimits.max_contracts}
                            tradesRemaining={vaultState.trades_remaining_today ?? MAX_LOSSES_PER_DAY}
                            lossStreak={vaultState.loss_streak ?? 0}
                            maxLossesPerDay={MAX_LOSSES_PER_DAY}
                            rewardTargets={{ riskPerTrade: riskBudget / MAX_LOSSES_PER_DAY }}
                          />
                        </div>
                      );
                    })()}

                    {/* Card 2: Your Session */}
                    <div className="vault-obsidian-surface p-4 md:p-2.5 space-y-2">
                      <SessionSetupCard onPhaseChange={setSessionPhase} />
                      {activePlan && activePlan.status === "planned" && (
                        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <p className="text-[10px] font-medium text-foreground/60 flex-1 truncate">
                            {activePlan.ticker || "—"} · {activePlan.direction === "calls" ? "Calls" : "Puts"} · ${Number(activePlan.max_loss_planned).toFixed(0)} max
                          </p>
                          <button className="text-[9px] text-muted-foreground/30 hover:text-muted-foreground/60" onClick={() => handleCancelPlan(activePlan.id)}>Cancel</button>
                        </div>
                      )}
                    </div>

                    {/* Card 3: Your Focus */}
                    {activePlan ? (
                      <FocusReminderCards
                        layout="unified"
                        direction={activePlan.direction}
                        maxLoss={Number(activePlan.max_loss_planned)}
                        maxTrades={MAX_LOSSES_PER_DAY}
                      />
                    ) : (
                      <div className="vault-obsidian-surface p-4 md:p-2.5 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <p className="text-sm text-muted-foreground/40">No rules set.</p>
                          <Button size="sm" className="gap-1 rounded-lg h-8 text-[11px]" onClick={() => setStage("plan")}>
                            <Calendar className="h-3 w-3" /> Start Your Day
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ═══ SESSION STATS (collapsed) ═══ */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2 hover:bg-white/[0.04] transition-colors group">
                      <span className="text-[10px] font-semibold text-foreground/50">Session Stats</span>
                      <ChevronDown className="h-3 w-3 text-muted-foreground/30 transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <DisciplineMetricsStrip
                        compact
                        vaultStatus={vaultState.vault_status}
                        complianceRate={complianceRate}
                        weeklyComplianceRate={weeklyComplianceRate}
                        currentStreak={currentStreak}
                        todayTrades={entries.filter(e => e.trade_date === new Date().toISOString().slice(0, 10))}
                        lossStreak={vaultState.loss_streak ?? 0}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* ═══ ACTIONS ═══ */}
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      className="w-full h-10 gap-2 rounded-xl text-xs font-semibold border-white/[0.08] hover:bg-white/[0.04]"
                      onClick={() => handleLogWithCutoffCheck(activePlan || undefined)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Quick Log Trade
                    </Button>
                  </div>

                  {sessionPhase && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          clearSession();
                          if (user) clearSessionFromDB(user.id);
                          setSessionPhase(null);
                          setExecuting(false);
                          setExecutionStart(null);
                          try { localStorage.removeItem("va_executing_today"); localStorage.removeItem("va_execution_start"); } catch {}
                          setStage("review");
                        }}
                        className="flex items-center justify-center gap-2 h-12 px-10 md:h-10 md:px-8 rounded-full text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-[0_4px_20px_hsla(0,72%,51%,0.25)] max-w-xs w-full"
                      >
                        <Square className="h-4 w-4" /> End Session & Review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW STAGE */}
              {activeStage === "review" && (
                <div className="space-y-5 vault-stage-enter">
                  <StageHeadline stage="review" />

                  {todayStatus === "complete" ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-center space-y-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">Session complete</p>
                      <p className="text-xs text-muted-foreground/60">Great work. See what the AI found about your trading patterns.</p>
                      <Button size="sm" className="gap-1.5 rounded-lg h-9 text-xs" onClick={() => setStage("insights")}>
                        <Brain className="h-3.5 w-3.5" /> View Insights
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Core Question Card */}
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] py-6 px-5 md:py-3 md:px-3 space-y-5">
                        <div className="text-center space-y-2">
                          <p className="text-xl md:text-base font-bold text-foreground">Did you follow your rules today?</p>
                          <p className="text-sm text-foreground/40">Be honest — this is how you grow.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              if (activePlan) {
                                const isRiskOnly = activePlan.entry_price_planned === 0;
                                setLogPlanId(activePlan.id);
                                setLogPrefill({
                                  symbol: activePlan.ticker || "",
                                  direction: activePlan.direction === "calls" ? "Calls" : "Puts",
                                  ...(isRiskOnly ? {} : {
                                    entryPrice: String(activePlan.entry_price_planned),
                                    positionSize: String(activePlan.contracts_planned),
                                  }),
                                  planFollowed: "Yes",
                                });
                              } else {
                                setLogPlanId(undefined);
                                setLogPrefill({ planFollowed: "Yes" });
                              }
                              setShowLogTrade(true);
                            }}
                            className="flex flex-col items-center gap-2.5 p-6 md:p-3 rounded-xl border-2 border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] hover:border-emerald-500/40 transition-all active:scale-[0.97]"
                          >
                            <CheckCircle2 className="h-8 w-8 md:h-5 md:w-5 text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-400">Yes, I followed it</span>
                            <span className="text-[10px] text-emerald-400/60">Quick log from your rules</span>
                          </button>
                          <button
                            onClick={() => {
                              // Blank manual entry
                              setLogPlanId(undefined);
                              setLogPrefill({ planFollowed: "No" });
                              setShowLogTrade(true);
                            }}
                            className="flex flex-col items-center gap-2.5 p-6 md:p-3 rounded-xl border-2 border-amber-500/25 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] hover:border-amber-500/40 transition-all active:scale-[0.97]"
                          >
                            <AlertTriangle className="h-8 w-8 md:h-5 md:w-5 text-amber-400" />
                            <span className="text-sm font-bold text-amber-400">No, I adjusted</span>
                            <span className="text-[10px] text-amber-400/60">Log what you actually did</span>
                          </button>
                        </div>
                      </div>

                      {todayTradeCount > 0 && (
                        <Button className="w-full h-10 gap-1.5 rounded-xl text-xs font-semibold" onClick={() => setShowCheckIn(true)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete Review
                        </Button>
                      )}

                      {todayTradeCount === 0 && !noTradeDay && (
                        <Button variant="ghost" className="w-full h-8 gap-1.5 rounded-lg text-[11px] font-medium text-muted-foreground/60 hover:text-foreground" onClick={() => setShowNoTradeDay(true)}>
                          <CalendarOff className="h-3.5 w-3.5" /> Mark No-Trade Day
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* INSIGHTS STAGE */}
              {activeStage === "insights" && (
                <div className="space-y-3 vault-stage-enter">
                  <StageHeadline stage="insights" />
                  {entries.length < 3 ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] py-8 px-5 md:py-4 md:px-3 space-y-4 text-center">
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
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Grade */}
                          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 md:p-2.5">
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
          </div>{/* close right: tabs+content */}
          </div>{/* close flex inside card */}
        </div>{/* close vault-os-card */}

        {/* ══════ LOWER ANALYTICS ══════ */}
        {showMetrics && (
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
