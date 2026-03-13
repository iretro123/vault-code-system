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
  const { user, session } = useAuth();
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

  useEffect(() => {
    if (todayTradeCount > 0 && todayStatus === "incomplete") {
      setTodayStatus("in_progress");
    }
  }, [todayTradeCount]);

  const { activeStage, setStage, stageStatus } = useSessionStage({
    hasActivePlan: !!activePlan,
    todayTradeCount,
    todayStatus,
    sessionActive: !vaultState.session_paused,
  });

  const cachedAI = useMemo(() => {
    try {
      const raw = localStorage.getItem("va_cache_ai_focus_v3");
      if (!raw) return null;
      return JSON.parse(raw) as { primaryLeak?: string; riskGrade?: string; nextAction?: string; strongestEdge?: string };
    } catch { return null; }
  }, [entries.length]);

  const totalMaxTrades = vaultState.trades_remaining_today + todayTradeCount;

  const todayEntries = useMemo(() => entries.filter(e => e.trade_date === todayStr), [entries, todayStr]);
  const todayCompliance = useMemo(() => {
    if (todayEntries.length === 0) return 100;
    const compliant = todayEntries.filter(e => e.followed_rules).length;
    return Math.round((compliant / todayEntries.length) * 100);
  }, [todayEntries]);

  const recentFive = useMemo(() => entries.slice(0, 5), [entries]);

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
  const vaultStatusColor = vaultState.vault_status === "GREEN"
    ? "text-emerald-400" : vaultState.vault_status === "YELLOW"
    ? "text-amber-400" : "text-red-400";
  const vaultStatusDot = vaultState.vault_status === "GREEN"
    ? "bg-emerald-400" : vaultState.vault_status === "YELLOW"
    ? "bg-amber-400" : "bg-red-400";

  const showMetrics = startingBalance !== null || hasData;

  const statusChip = (() => {
    if (todayStatus === "complete") return "Session complete";
    if (activePlan) return `${activePlan.ticker || "—"} ${activePlan.direction} active`;
    if (todayTradeCount > 0) return `${todayTradeCount} trade${todayTradeCount > 1 ? "s" : ""} logged`;
    return "No plan yet";
  })();

  return (
    <>
      <div className="px-4 md:px-8 pb-8 space-y-2.5 max-w-6xl pt-4">

        {/* ══════ COMMAND BAR ══════ */}
        {showMetrics && (
          <div className="flex items-center rounded-xl bg-black/30 border border-white/[0.08] overflow-hidden h-10">
            {/* Status chip */}
            <div className="flex items-center gap-2 px-3 shrink-0 border-r border-white/[0.08]">
              {todayStatus === "complete" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <span className={cn("w-[5px] h-[5px] rounded-full shrink-0", vaultStatusDot, activePlan && "animate-pulse")} />
              )}
              <span className={cn("text-[11px] font-semibold", todayStatus === "complete" ? "text-emerald-400" : vaultStatusColor)}>
                {vaultState.vault_status}
              </span>
              <span className="text-[11px] text-muted-foreground/40 hidden sm:inline">· {statusChip}</span>
            </div>
            {/* Balance */}
            <div className="flex items-center gap-1.5 px-3 border-r border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse shrink-0" />
              <span className="text-lg font-bold tabular-nums text-primary leading-none">
                {trackedBalance !== null ? `$${trackedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </span>
            </div>
            {/* Today P/L */}
            <div className="px-3 border-r border-white/[0.08] hidden sm:block">
              <span className={cn("text-sm font-semibold tabular-nums", todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-foreground")}>
                {todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`}
              </span>
            </div>
            {/* Trades */}
            <div className="px-3 border-r border-white/[0.08] hidden md:block">
              <span className="text-sm font-semibold tabular-nums text-foreground">{todayTradeCount}</span>
              <span className="text-muted-foreground/40 text-[11px]"> / {totalMaxTrades}</span>
            </div>
            {/* Risk */}
            <div className="px-3 hidden md:block">
              <span className={cn("text-sm font-semibold tabular-nums", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
                ${vaultState.risk_remaining_today.toFixed(0)}
              </span>
              <span className="text-muted-foreground/40 text-[11px]"> risk</span>
            </div>
            {/* Log CTA */}
            <div className="ml-auto px-2 shrink-0">
              <Button size="sm" className="gap-1.5 h-7 px-3 text-[11px] font-semibold rounded-lg" onClick={handleLogUnplanned}>
                <Plus className="h-3 w-3" /> Log
              </Button>
            </div>
          </div>
        )}

        {/* Balance skip reminder */}
        {balanceSkipped && startingBalance === null && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-foreground font-medium flex-1 min-w-0">Starting balance not set — tracking paused.</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[11px] h-7 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full" onClick={() => setShowBalanceModal(true)}>Set Now</Button>
          </div>
        )}

        {!hasData && !showMetrics && (
          <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
        )}

        {/* ══════ HERO OS CARD ══════ */}
        <div className="rounded-xl border border-white/[0.08] bg-card overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          {/* Top edge highlight */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.3), transparent)' }} />

          {/* Tabs */}
          <OSTabHeader activeStage={activeStage} stageStatus={stageStatus} onSelect={setStage} />

          {/* Two-column body */}
          <div className="flex flex-col md:flex-row">
            {/* ── LEFT MAIN ZONE ── */}
            <div className="flex-[2.5] min-w-0 p-3 md:p-4 md:border-r border-white/[0.08]">

              {/* PLAN STAGE */}
              {activeStage === "plan" && (
                <div className="space-y-3">
                  {activePlan && activePlan.status === "planned" && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span className="text-[13px] font-bold text-foreground">{activePlan.ticker || "—"}</span>
                          <span className="text-[11px] text-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" className="h-7 text-[11px] gap-1 rounded-lg px-3" onClick={() => handleLogFromPlan(activePlan)}>
                            <CheckCircle2 className="h-3 w-3" /> Log
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground/50" onClick={() => handleCancelPlan(activePlan.id)}>Cancel</Button>
                        </div>
                      </div>
                      <p className="text-[11px] text-foreground/60 pl-4">
                        Max risk: ${Number(activePlan.max_loss_planned).toFixed(0)} · Entry: ${Number(activePlan.entry_price_planned).toFixed(2)} · Ready to execute
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 pl-4">Plan saved · Live data</p>
                      {/* Stage transition CTA */}
                      <Button size="sm" className="w-full h-9 text-[11px] gap-1.5 rounded-lg font-semibold mt-1" onClick={() => setStage("live")}>
                        <Radio className="h-3.5 w-3.5" /> Plan approved — Go to Live Mode
                      </Button>
                    </div>
                  )}
                  {/* Embedded VaultTradePlanner */}
                  {!activePlan && todayStatus !== "complete" && (
                    <div ref={plannerRef}>
                      <VaultTradePlanner
                        balanceOverride={trackedBalance}
                        activePlanOverride={activePlan}
                        savePlanOverride={undefined}
                        replaceWithNewOverride={undefined}
                        onPlanSaved={refetchPlan}
                      />
                    </div>
                  )}
                  {todayStatus === "complete" && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <p className="text-[13px] text-emerald-400/80 font-medium flex-1">Session complete. Review your AI insights.</p>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-400 px-2.5" onClick={() => setStage("insights")}>
                        <Brain className="h-3 w-3 mr-1" /> View Insights
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE STAGE */}
              {activeStage === "live" && (
                <div className="space-y-3">
                  {/* Active Plan (prominent) */}
                  {activePlan && activePlan.status === "planned" && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                        <span className="text-base font-bold text-foreground">{activePlan.ticker || "—"}</span>
                        <span className="text-[11px] text-foreground/60">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct · ${Number(activePlan.entry_price_planned).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-foreground/60 pl-5">
                        Max risk: ${Number(activePlan.max_loss_planned).toFixed(0)} · {activePlan.stop_price_planned ? `Stop: $${Number(activePlan.stop_price_planned).toFixed(2)}` : "No stop set"} · Executing
                      </p>
                      <Button size="sm" className="h-9 text-[11px] gap-1.5 rounded-lg px-4 w-full font-semibold" onClick={() => handleLogFromPlan(activePlan)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Log Result
                      </Button>
                    </div>
                  )}

                  {/* Today's session metrics */}
                  {todayTradeCount > 0 && (
                    <div className="flex items-center divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] overflow-hidden">
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Trades</p>
                        <p className="text-base font-semibold tabular-nums text-foreground">{todayTradeCount}</p>
                      </div>
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">P/L</p>
                        <p className={cn("text-base font-semibold tabular-nums", todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : "text-foreground")}>
                          {todayPnl >= 0 ? "+" : "-"}${Math.abs(todayPnl).toFixed(0)}
                        </p>
                      </div>
                      <div className="flex-1 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Compliance</p>
                        <p className={cn("text-base font-semibold tabular-nums", todayCompliance === 100 ? "text-emerald-400" : "text-amber-400")}>{todayCompliance}%</p>
                      </div>
                    </div>
                  )}

                  {/* Limits inline */}
                  <TodaysLimitsSection />

                  {/* Stage transition: trades logged → go to review */}
                  {todayTradeCount > 0 && todayStatus !== "complete" && (
                    <Button size="sm" className="w-full h-9 text-[11px] gap-1.5 rounded-lg font-semibold" onClick={() => setStage("review")}>
                      <ClipboardCheck className="h-3.5 w-3.5" /> Trade logged — Complete your Review
                    </Button>
                  )}

                  {/* No plan state */}
                  {!activePlan && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">No Active Plan</p>
                        <p className="text-[11px] text-muted-foreground/60">Build a plan in the Plan tab first, or log a trade directly.</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" className="gap-1 rounded-lg px-3 h-8 text-[11px]" onClick={() => setStage("plan")}>
                          <Calendar className="h-3 w-3" /> Plan
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg px-3 h-8 text-[11px] border-white/[0.08]" onClick={handleLogUnplanned}>
                          <Plus className="h-3 w-3" /> Log
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW STAGE */}
              {activeStage === "review" && (
                <div className="space-y-3">
                  {entries.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-[13px] text-muted-foreground/60">No trades logged yet.</p>
                      <Button size="sm" className="gap-1.5 rounded-lg px-4 h-9 text-[11px]" onClick={handleLogUnplanned}>
                        <Plus className="h-3 w-3" /> Log a Trade
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Action cards */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          onClick={handleLogUnplanned}
                          className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-left group"
                        >
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-foreground">Log a Trade</p>
                            <p className="text-[11px] text-muted-foreground/60">Result, screenshots, notes</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                        </button>
                        <button
                          onClick={() => setShowCheckIn(true)}
                          className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] hover:border-emerald-500/25 transition-all text-left group"
                        >
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-foreground">Complete Check-In</p>
                            <p className="text-[11px] text-muted-foreground/60">Mistakes, lessons, close session</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-emerald-400/60 transition-colors" />
                        </button>
                      </div>

                      {/* Recent trades */}
                      <div>
                        <p className="text-[11px] tracking-[0.08em] font-semibold text-muted-foreground/60 uppercase mb-2">
                          {todayTradeCount > 0 ? `Today (${todayTradeCount})` : "Recent"}
                        </p>
                        <div className="space-y-0.5 rounded-lg border border-white/[0.08] overflow-hidden">
                          {(todayTradeCount > 0 ? todayEntries : recentFive).map(e => {
                            const pnl = e.risk_reward * e.risk_used;
                            const isWin = e.risk_reward > 0;
                            const isLoss = e.risk_reward < 0;
                            return (
                              <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", isWin ? "bg-emerald-400" : isLoss ? "bg-red-400" : "bg-muted-foreground/20")} />
                                <span className="text-[13px] font-semibold text-foreground min-w-[40px]">{e.symbol || "—"}</span>
                                <span className="text-[11px] text-muted-foreground/50 flex-1 truncate">{e.outcome || "—"} {e.followed_rules ? "✓" : "✗"}</span>
                                <span className={cn("text-[13px] font-semibold tabular-nums", isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-muted-foreground/40")}>
                                  {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(0)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {todayStatus === "complete" && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <p className="text-[13px] text-emerald-400/80 font-medium flex-1">Session complete. See what AI found.</p>
                          <Button size="sm" variant="ghost" className="h-7 text-[11px] text-emerald-400 px-2.5" onClick={() => setStage("insights")}>
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
                <div className="space-y-3">
                  {/* Framing header */}
                  {cachedAI && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase mb-1">Grade</p>
                        <p className={cn("text-xl font-bold",
                          cachedAI.riskGrade === "A" ? "text-emerald-400" :
                          cachedAI.riskGrade === "B" ? "text-primary" :
                          cachedAI.riskGrade === "C" ? "text-amber-400" : "text-red-400"
                        )}>
                          {cachedAI.riskGrade || "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase mb-1">Leak</p>
                        <p className="text-[11px] font-semibold text-foreground/80 truncate">{cachedAI.primaryLeak || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase mb-1">Edge</p>
                        <p className="text-[11px] font-semibold text-foreground/80 truncate">{cachedAI.strongestEdge || "—"}</p>
                      </div>
                      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-center">
                        <p className="text-[10px] text-muted-foreground/60 font-medium uppercase mb-1">Next Action</p>
                        <p className="text-[11px] font-semibold text-foreground/80 truncate">{cachedAI.nextAction || "—"}</p>
                      </div>
                    </div>
                  )}
                  <AIFocusCard entries={entries} accessToken={session?.access_token} />
                </div>
              )}
            </div>

            {/* ── RIGHT SESSION RAIL ── */}
            <div className="flex-[0.8] min-w-0 p-3 border-t md:border-t-0 border-white/[0.08]">
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

          {/* ── INTELLIGENCE STRIP ── */}
          {cachedAI && (
            <button
              onClick={() => setStage("insights")}
              className="w-full border-t border-white/[0.08] hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center divide-x divide-white/[0.08]">
                <div className="flex items-center gap-1.5 px-3 py-2 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground/40 font-medium">AI</span>
                </div>
                <div className="flex-1 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Grade</p>
                  <p className={cn("text-base font-bold",
                    cachedAI.riskGrade === "A" ? "text-emerald-400" :
                    cachedAI.riskGrade === "B" ? "text-primary" :
                    cachedAI.riskGrade === "C" ? "text-amber-400" : "text-red-400"
                  )}>
                    {cachedAI.riskGrade || "—"}
                  </p>
                </div>
                <div className="flex-1 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Leak</p>
                  <p className="text-[11px] font-semibold text-foreground/70 truncate">{cachedAI.primaryLeak || "—"}</p>
                </div>
                <div className="flex-1 px-3 py-2 hidden md:block">
                  <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Edge</p>
                  <p className="text-[11px] font-semibold text-foreground/70 truncate">{cachedAI.strongestEdge || "—"}</p>
                </div>
                <div className="flex-1 px-3 py-2 hidden md:block">
                  <p className="text-[10px] text-muted-foreground/60 font-medium mb-0.5">Next</p>
                  <p className="text-[11px] font-semibold text-foreground/70 truncate">{cachedAI.nextAction || "—"}</p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ══════ LOWER ANALYTICS ══════ */}
        {hasData && (
          <div className="space-y-2.5 pt-2">
            <p className="text-[11px] tracking-[0.08em] font-semibold text-muted-foreground/50 uppercase px-0.5">Performance & History</p>
            <div className="grid gap-2.5 md:grid-cols-2">
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
