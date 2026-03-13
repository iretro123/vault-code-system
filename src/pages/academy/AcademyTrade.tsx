import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Shield, AlertTriangle, CheckCircle2, Brain, ChevronRight, ClipboardCheck, Calendar, Radio } from "lucide-react";
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
import { useApprovedPlans, type ApprovedPlan } from "@/hooks/useApprovedPlans";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useSessionStage } from "@/hooks/useSessionStage";
import { useVaultState } from "@/contexts/VaultStateContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Extracted components
import { SectionLabel } from "@/components/trade-os/SectionLabel";
import { PerformanceHUD } from "@/components/trade-os/PerformanceHUD";
import { EquityCurveCard } from "@/components/trade-os/EquityCurveCard";
import { PerformanceBreakdownCard } from "@/components/trade-os/PerformanceBreakdownCard";
import { GettingStartedBanner } from "@/components/trade-os/GettingStartedBanner";
import { TodayVaultCheckCard } from "@/components/trade-os/TodayVaultCheckCard";
import { AIFocusCard } from "@/components/trade-os/AIFocusCard";
import { RecentTradesSection } from "@/components/trade-os/RecentTradesSection";
import { TrackedBalanceCard } from "@/components/trade-os/TrackedBalanceCard";
import { WeeklyReviewCard } from "@/components/trade-os/WeeklyReviewCard";
import { OSTabHeader } from "@/components/trade-os/OSTabHeader";
import { TodaysLimitsSection } from "@/components/vault/TodaysLimitsSection";
import { VaultTradePlanner } from "@/components/vault-planner/VaultTradePlanner";
import { OSControlRail } from "@/components/trade-os/OSControlRail";

type TodayStatus = "incomplete" | "in_progress" | "complete";

const AcademyTrade = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const { user } = useAuth();
  const { isPageEnabled } = useFeatureFlags();
  const { state: vaultState } = useVaultState();
  const {
    entries, loading: tradesLoading, addEntry, deleteEntry, exportCSV, refetch: refetchTrades,
    allTimeWinRate, complianceRate, currentStreak, todayPnl, totalPnl, equityCurve, symbolStats, dayStats,
  } = useTradeLog();
  const { activePlan, loading: planLoading, cancelPlan, markLogged, refetch: refetchPlan } = useApprovedPlans();

  const plannerRef = useRef<HTMLDivElement>(null);

  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUpdateBalance, setShowUpdateBalance] = useState(false);
  const [updateBalanceInput, setUpdateBalanceInput] = useState("");
  const [updatingBalance, setUpdatingBalance] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showLogTrade, setShowLogTrade] = useState(false);
  const [logPlanId, setLogPlanId] = useState<string | undefined>(undefined);
  const [logPrefill, setLogPrefill] = useState<any>(undefined);
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

  const hasData = entries.length > 0;

  // ── FIX D: Initialize todayStatus from existing data ──
  useEffect(() => {
    if (todayTradeCount > 0 && todayStatus === "incomplete") {
      setTodayStatus("in_progress");
    }
  }, [todayTradeCount]);

  // Session stage hook
  const { activeStage, setStage, stageStatus } = useSessionStage({
    hasActivePlan: !!activePlan,
    todayTradeCount,
    todayStatus,
    sessionActive: !vaultState.session_paused,
  });

  // Read cached AI result for compact preview strip
  const cachedAI = useMemo(() => {
    try {
      const raw = localStorage.getItem("va_cache_ai_focus_v3");
      if (!raw) return null;
      return JSON.parse(raw) as { primaryLeak?: string; riskGrade?: string; nextAction?: string; strongestEdge?: string };
    } catch { return null; }
  }, [entries.length]);

  const totalMaxTrades = vaultState.trades_remaining_today + todayTradeCount;

  // Today's compliance for Live tab
  const todayEntries = useMemo(() => entries.filter(e => e.trade_date === todayStr), [entries, todayStr]);
  const todayCompliance = useMemo(() => {
    if (todayEntries.length === 0) return 100;
    const compliant = todayEntries.filter(e => e.followed_rules).length;
    return Math.round((compliant / todayEntries.length) * 100);
  }, [todayEntries]);

  // Recent 5 for Review tab
  const recentFive = useMemo(() => entries.slice(0, 5), [entries]);

  /* ── Handlers (identical to classic) ── */
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

  const handleUpdateBalance = async () => {
    const newBalance = parseFloat(updateBalanceInput);
    if (isNaN(newBalance) || newBalance < 0 || !user) return;
    setUpdatingBalance(true);
    try {
      const newStarting = newBalance - totalPnl;
      const { error } = await supabase.from("profiles").update({ account_balance: newStarting }).eq("user_id", user.id);
      if (error) throw error;
      setStartingBalance(newStarting);
      setShowUpdateBalance(false);
      setUpdateBalanceInput("");
      toast({ title: "Balance updated", description: `Now tracking from $${newBalance.toLocaleString()}.` });
    } catch {
      toast({ title: "Error updating balance", variant: "destructive" });
    } finally {
      setUpdatingBalance(false);
    }
  };

  const handleTradeSubmit = async (data: TradeFormData) => {
    const pnlNum = parseFloat(data.pnl) || 0;
    const isWin = data.resultType === "Win";
    const isLoss = data.resultType === "Loss";

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
      risk_reward: isWin ? 1 : isLoss ? -1 : 0,
      followed_rules: data.planFollowed === "Yes",
      emotional_state: 5,
      notes: `${data.symbol} ${data.direction} | Setup: ${data.setupUsed || "—"} | Target: ${data.targetHit} | Stop: ${data.stopRespected} | Oversized: ${data.oversized}${data.note ? " | " + data.note : ""}`,
      symbol: data.symbol.toUpperCase(),
      outcome: isWin ? "WIN" : isLoss ? "LOSS" : "BREAKEVEN",
      trade_date: format(data.date, "yyyy-MM-dd"),
      plan_id: logPlanId,
    };
    if (screenshotUrl) newEntry.screenshot_url = screenshotUrl;

    const { error } = await addEntry(newEntry);
    if (error) throw error;

    if (logPlanId) {
      await markLogged(logPlanId);
      refetchPlan();
    }

    setShowLogTrade(false);
    setLogPlanId(undefined);
    setLogPrefill(undefined);
    setTodayStatus("in_progress");
    setTimeout(() => setShowCheckIn(true), 400);
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

  // FIX B: scroll to embedded planner instead of navigating away
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

  // Quick action handler for the rail (must be before early returns)
  const handleQuickAction = useCallback(() => {
    if (activeStage === "plan") handleScrollToPlanner();
    else if (activeStage === "live") {
      if (activePlan) handleLogFromPlan(activePlan);
      else handleLogUnplanned();
    }
    else if (activeStage === "review") setShowCheckIn(true);
    else if (activeStage === "insights") {
      document.getElementById("ai-focus-card")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeStage, activePlan, handleLogFromPlan, handleLogUnplanned, handleScrollToPlanner]);


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
                <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} />
              )}
            </section>
          )}
          {trackedBalance !== null && (
            <section className="space-y-2.5">
              <SectionLabel>Account</SectionLabel>
              <TrackedBalanceCard
                balance={trackedBalance}
                showResetConfirm={showResetConfirm} resetInput={resetInput} resetting={resetting}
                onToggleReset={() => { setShowResetConfirm(!showResetConfirm); setResetInput(""); setShowUpdateBalance(false); }}
                onResetInputChange={setResetInput} onConfirmReset={handleResetBalance}
                showUpdateBalance={showUpdateBalance} updateBalanceInput={updateBalanceInput} updatingBalance={updatingBalance}
                onToggleUpdate={() => { setShowUpdateBalance(!showUpdateBalance); setUpdateBalanceInput(trackedBalance ? String(Math.round(trackedBalance)) : ""); setShowResetConfirm(false); }}
                onUpdateInputChange={setUpdateBalanceInput} onConfirmUpdate={handleUpdateBalance}
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
            <AIFocusCard entries={entries} />
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
            <WeeklyReviewCard hasData={hasData} />
          </section>
        </div>

        <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
        <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} planId={logPlanId} prefill={logPrefill} />
        <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} />
        <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} />
      </>
    );
  }

  // ──── OS LAYOUT (feature flag ON) ────
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const statusLine = (() => {
    if (todayStatus === "complete") return "Today's session complete";
    if (activePlan) return `Plan approved · ${activePlan.ticker || "—"} ${activePlan.direction}`;
    if (todayTradeCount > 0) return `${todayTradeCount} trade${todayTradeCount > 1 ? "s" : ""} logged today`;
    return "No plan yet — start your session";
  })();

  const vaultStatusColor = vaultState.vault_status === "GREEN"
    ? "bg-emerald-400" : vaultState.vault_status === "YELLOW"
    ? "bg-amber-400" : vaultState.vault_status === "RED"
    ? "bg-red-400" : "bg-muted-foreground/40";

  // Whether to show metrics strip: balance set OR trades exist (FIX E)
  const showMetrics = startingBalance !== null || hasData;


  return (
    <>
      {/* ══════ LAYER 1 — GREETING + STATUS ══════ */}
      <div className="px-4 md:px-8 pt-5 md:pt-6 pb-0.5 max-w-6xl">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
          {greeting}{displayName ? `, ${displayName}` : ""}
        </h1>
        <div className="flex items-center gap-2 mt-0.5">
          {todayStatus === "complete" ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
          ) : (
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", vaultStatusColor, activePlan && "animate-pulse")} />
          )}
          <span className="text-xs text-muted-foreground/70">{statusLine}</span>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-10 space-y-3 md:space-y-4 max-w-6xl">

        {/* ══════ LAYER 1.5 — METRICS STATUS BAR ══════ */}
        {showMetrics && (
          <div className="flex items-center rounded-xl border border-border/10 bg-card divide-x divide-border/10 overflow-hidden">
            {/* Balance */}
            <div className="flex-1 px-3 md:px-4 py-2 md:py-2.5">
              <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Balance</p>
              <p className="text-base font-semibold tabular-nums text-primary leading-none truncate">
                {trackedBalance !== null ? `$${trackedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </p>
            </div>
            {/* Today P/L */}
            <div className="flex-1 px-3 md:px-4 py-2 md:py-2.5">
              <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Today P/L</p>
              <p className={cn("text-base font-semibold tabular-nums leading-none", todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-foreground")}>
                {todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`}
              </p>
            </div>
            {/* Trades */}
            <div className="flex-1 px-3 md:px-4 py-2 md:py-2.5">
              <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Trades</p>
              <p className="text-base font-semibold tabular-nums leading-none text-foreground">
                {todayTradeCount}<span className="text-muted-foreground/30 font-normal text-xs"> / {totalMaxTrades}</span>
              </p>
            </div>
            {/* Risk Left */}
            <div className="flex-1 px-3 md:px-4 py-2 md:py-2.5 hidden sm:block">
              <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Risk Left</p>
              <p className={cn("text-base font-semibold tabular-nums leading-none", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
                ${vaultState.risk_remaining_today.toFixed(0)}
              </p>
            </div>
            {/* Streak */}
            <div className="flex-1 px-3 md:px-4 py-2 md:py-2.5 hidden md:block">
              <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Streak</p>
              <p className="text-base font-semibold tabular-nums leading-none text-foreground">{currentStreak}</p>
            </div>
            {/* + Log Trade CTA */}
            <div className="px-3 md:px-4 py-2 md:py-2.5 shrink-0">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 px-3.5 text-[11px] font-semibold rounded-lg whitespace-nowrap border-border/20" onClick={handleLogUnplanned}>
                <Plus className="h-3 w-3" /> Log
              </Button>
            </div>
          </div>
        )}

        {/* Balance skip reminder */}
        {balanceSkipped && startingBalance === null && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-foreground font-medium flex-1 min-w-0">Starting balance not set — tracking paused.</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[11px] h-7 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full" onClick={() => setShowBalanceModal(true)}>Set Now</Button>
          </div>
        )}

        {/* Getting Started (only when truly empty) */}
        {!hasData && !showMetrics && (
          <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
        )}

        {/* ══════ LAYER 2 — HERO OS CARD (two-column) ══════ */}
        <div className="rounded-xl border border-border/10 bg-card overflow-hidden shadow-md shadow-black/10">
          {/* Tabs */}
          <OSTabHeader activeStage={activeStage} stageStatus={stageStatus} onSelect={setStage} />

          {/* Two-column body */}
          <div className="flex flex-col md:flex-row">
            {/* ── LEFT MAIN ZONE ── */}
            <div className="flex-[2.5] min-w-0 p-4 md:p-5 md:border-r border-border/10">

              {/* PLAN STAGE */}
              {activeStage === "plan" && (
                <div className="space-y-4">
                  {activePlan && activePlan.status === "planned" && (
                    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] px-3.5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-sm font-semibold text-foreground">{activePlan.ticker || "—"}</span>
                          <span className="text-[11px] text-muted-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" className="h-7 text-[11px] gap-1 rounded-lg px-3" onClick={() => handleLogFromPlan(activePlan)}>
                            <CheckCircle2 className="h-3 w-3" /> Log
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground/50" onClick={() => handleCancelPlan(activePlan.id)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Embedded VaultTradePlanner */}
                  {!activePlan && todayStatus !== "complete" && (
                    <div ref={plannerRef}>
                      <VaultTradePlanner />
                    </div>
                  )}
                  {todayStatus === "complete" && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400/70 font-medium flex-1">Session complete.</p>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-400 px-2.5" onClick={() => setStage("insights")}>Insights →</Button>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE STAGE */}
              {activeStage === "live" && (
                <div className="space-y-4">
                  {/* Active Plan (prominent) */}
                  {activePlan && activePlan.status === "planned" && (
                    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] px-3.5 py-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-base font-semibold text-foreground">{activePlan.ticker || "—"}</span>
                        <span className="text-[11px] text-muted-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct · ${Number(activePlan.entry_price_planned).toFixed(2)}</span>
                      </div>
                      <Button size="sm" className="h-8 text-[11px] gap-1.5 rounded-lg px-4" onClick={() => handleLogFromPlan(activePlan)}>
                        <CheckCircle2 className="h-3 w-3" /> Log Result
                      </Button>
                    </div>
                  )}

                  {/* Today's session metrics */}
                  {todayTradeCount > 0 && (
                    <div className="flex items-center divide-x divide-border/10 rounded-lg border border-border/10 overflow-hidden">
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Trades</p>
                        <p className="text-base font-semibold tabular-nums text-foreground">{todayTradeCount}</p>
                      </div>
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">P/L</p>
                        <p className={cn("text-base font-semibold tabular-nums", todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-foreground")}>
                          {todayPnl >= 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(0)}
                        </p>
                      </div>
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/50 font-medium mb-0.5">Compliance</p>
                        <p className={cn("text-base font-semibold tabular-nums", todayCompliance === 100 ? "text-emerald-400" : "text-amber-400")}>{todayCompliance}%</p>
                      </div>
                    </div>
                  )}

                  {/* Limits inline */}
                  <TodaysLimitsSection />

                  {/* No plan state */}
                  {!activePlan && (
                    <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">No Active Plan</p>
                        <p className="text-[11px] text-muted-foreground/50">Check a trade in the Plan tab first.</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="gap-1 rounded-lg px-3 h-7 text-[11px]" onClick={() => setStage("plan")}>Plan</Button>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg px-3 h-7 text-[11px] border-border/20" onClick={handleLogUnplanned}>
                          <Plus className="h-3 w-3" /> Log
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW STAGE */}
              {activeStage === "review" && (
                <div className="space-y-4">
                  {entries.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-sm text-muted-foreground/50">No trades logged yet.</p>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg px-4 h-8 text-[11px] border-border/20" onClick={handleLogUnplanned}>
                        <Plus className="h-3 w-3" /> Log a Trade
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Action row */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button onClick={handleLogUnplanned} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted/10 transition-colors text-left group">
                          <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground">Log a Trade</p>
                            <p className="text-[10px] text-muted-foreground/40">Result, screenshots, notes</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button onClick={() => setShowCheckIn(true)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-emerald-500/[0.05] transition-colors text-left group">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-foreground">Complete Check-In</p>
                            <p className="text-[10px] text-muted-foreground/40">Mistakes, lessons, close session</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>

                      {/* Recent trades */}
                      <div>
                        <p className="text-[10px] tracking-[0.1em] font-semibold text-muted-foreground/30 uppercase mb-2">
                          {todayTradeCount > 0 ? `Today (${todayTradeCount})` : "Recent"}
                        </p>
                        <div className="space-y-0.5">
                          {(todayTradeCount > 0 ? todayEntries : recentFive).map(e => {
                            const pnl = e.risk_reward * e.risk_used;
                            const isWin = e.risk_reward > 0;
                            const isLoss = e.risk_reward < 0;
                            return (
                              <div key={e.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-muted/[0.05] transition-colors">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isWin ? "bg-emerald-400" : isLoss ? "bg-red-400" : "bg-muted-foreground/20")} />
                                <span className="text-[13px] font-semibold text-foreground min-w-[40px]">{e.symbol || "—"}</span>
                                <span className="text-[11px] text-muted-foreground/35 flex-1 truncate">{e.outcome || "—"} {e.followed_rules ? "✓" : "✗"}</span>
                                <span className={cn("text-[13px] font-semibold tabular-nums", isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-muted-foreground/30")}>
                                  {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {todayStatus === "complete" && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <p className="text-xs text-emerald-400/70 font-medium flex-1">Session complete.</p>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-400 px-2.5" onClick={() => setStage("insights")}>Insights →</Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* INSIGHTS STAGE */}
              {activeStage === "insights" && (
                <div>
                  <AIFocusCard entries={entries} />
                </div>
              )}
            </div>

            {/* ── RIGHT CONTROL RAIL ── */}
            <div className="flex-[0.75] min-w-0 p-3 md:p-4 border-t md:border-t-0 border-border/10">
              <OSControlRail
                activePlan={activePlan}
                vaultState={vaultState}
                todayTradeCount={todayTradeCount}
                activeStage={activeStage}
                onQuickAction={handleQuickAction}
                onLogFromPlan={handleLogFromPlan}
              />
            </div>
          </div>

          {/* ── INTELLIGENCE STRIP (bottom of hero card) ── */}
          {cachedAI && (
            <button
              onClick={() => setStage("insights")}
              className="w-full border-t border-border/10 hover:bg-muted/[0.04] transition-colors"
            >
              <div className="flex items-center divide-x divide-border/10">
                <div className="flex-1 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground/35 font-medium mb-0.5">Grade</p>
                  <p className={cn("text-sm font-semibold",
                    cachedAI.riskGrade === "A" ? "text-emerald-400" :
                    cachedAI.riskGrade === "B" ? "text-primary" :
                    cachedAI.riskGrade === "C" ? "text-amber-400" : "text-red-400"
                  )}>
                    {cachedAI.riskGrade || "—"}
                  </p>
                </div>
                <div className="flex-1 px-3 py-2">
                  <p className="text-[9px] text-muted-foreground/35 font-medium mb-0.5">Leak</p>
                  <p className="text-[11px] font-medium text-foreground/60 truncate">{cachedAI.primaryLeak || "—"}</p>
                </div>
                <div className="flex-1 px-3 py-2 hidden md:block">
                  <p className="text-[9px] text-muted-foreground/35 font-medium mb-0.5">Edge</p>
                  <p className="text-[11px] font-medium text-foreground/60 truncate">{cachedAI.strongestEdge || "—"}</p>
                </div>
                <div className="flex-1 px-3 py-2 hidden md:block">
                  <p className="text-[9px] text-muted-foreground/35 font-medium mb-0.5">Next</p>
                  <p className="text-[11px] font-medium text-foreground/60 truncate">{cachedAI.nextAction || "—"}</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ══════ LAYER 3 — LOWER ANALYTICS (quieter) ══════ */}
        {hasData && (
          <div className="space-y-4 pt-2">
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground/25 px-1">Performance & History</p>
            <div className="grid gap-4 md:grid-cols-2">
              {equityCurve.length > 1 && startingBalance !== null && (
                <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} />
              )}
              {symbolStats.length > 0 && (
                <PerformanceBreakdownCard symbolStats={symbolStats} dayStats={dayStats} />
              )}
            </div>
            <RecentTradesSection entries={entries} onExportCSV={exportCSV} onDelete={handleDeleteEntry} />
            {trackedBalance !== null && (
              <TrackedBalanceCard
                balance={trackedBalance}
                showResetConfirm={showResetConfirm} resetInput={resetInput} resetting={resetting}
                onToggleReset={() => { setShowResetConfirm(!showResetConfirm); setResetInput(""); setShowUpdateBalance(false); }}
                onResetInputChange={setResetInput} onConfirmReset={handleResetBalance}
                showUpdateBalance={showUpdateBalance} updateBalanceInput={updateBalanceInput} updatingBalance={updatingBalance}
                onToggleUpdate={() => { setShowUpdateBalance(!showUpdateBalance); setUpdateBalanceInput(trackedBalance ? String(Math.round(trackedBalance)) : ""); setShowResetConfirm(false); }}
                onUpdateInputChange={setUpdateBalanceInput} onConfirmUpdate={handleUpdateBalance}
              />
            )}
            <WeeklyReviewCard hasData={hasData} />
          </div>
        )}
      </div>

      {/* Modals */}
      <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} planId={logPlanId} prefill={logPrefill} />
      <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} />
      <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} />
    </>
  );
};

export default AcademyTrade;
