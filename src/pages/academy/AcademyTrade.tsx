import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
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

  // Session stage hook
  const { activeStage, setStage, stageStatus } = useSessionStage({
    hasActivePlan: !!activePlan,
    todayTradeCount,
    todayStatus,
    sessionActive: !vaultState.session_paused,
  });

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

  const handleCheckInComplete = () => { setShowCheckIn(false); setTodayStatus("complete"); toast({ title: "Check-in complete", description: "AI review is ready for this session." }); };
  const handleNoTradeDayComplete = () => { setShowNoTradeDay(false); setNoTradeDay(true); setTodayStatus("complete"); toast({ title: "No-trade day logged" }); };

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
            <RecentTradesSection entries={entries} onExportCSV={exportCSV} onDelete={async (id) => {
              const result = await deleteEntry(id);
              if (!result.error) refetchPlan();
              return result;
            }} />
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

  return (
    <>
      {/* ══════ GREETING HEADER ══════ */}
      <div className="px-4 md:px-6 pt-6 md:pt-8 pb-1 max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {greeting}{displayName ? `, ${displayName}` : ""}
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          {todayStatus === "complete" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <span className={cn("w-2 h-2 rounded-full shrink-0", vaultStatusColor, activePlan && todayStatus !== "complete" && "animate-pulse")} />
          )}
          <span className="text-sm text-muted-foreground">{statusLine}</span>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-10 space-y-5 max-w-4xl">

        {/* ══════ METRICS STRIP ══════ */}
        {hasData && (
          <div className="flex items-stretch rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
            <MetricCell
              label="Balance"
              value={trackedBalance !== null ? `$${trackedBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              hero
            />
            <MetricCell
              label="Today P/L"
              value={todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`}
              color={todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : undefined}
            />
            <MetricCell label="Trades" value={`${todayTradeCount}/${vaultState.trades_remaining_today + todayTradeCount}`} />
            <MetricCell
              label="Risk Left"
              value={`$${vaultState.risk_remaining_today.toFixed(0)}`}
              color={vaultState.risk_remaining_today <= 0 ? "text-red-400" : undefined}
            />
            {!isMobile && <MetricCell label="Streak" value={`${currentStreak}d`} />}
            <div className="flex items-center px-3 md:px-4">
              <Button
                size="sm"
                className="gap-1.5 h-9 px-4 text-xs font-semibold rounded-full whitespace-nowrap shadow-[0_0_12px_2px_hsl(217_91%_60%/0.12)]"
                onClick={handleLogUnplanned}
              >
                <Plus className="h-3.5 w-3.5" /> Log Trade
              </Button>
            </div>
          </div>
        )}

        {/* ── Balance skip reminder ── */}
        {balanceSkipped && startingBalance === null && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-foreground font-medium flex-1 min-w-0">Starting balance not set — tracking is paused.</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[11px] h-7 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-full" onClick={() => setShowBalanceModal(true)}>Set Now</Button>
          </div>
        )}

        {/* ── Getting Started ── */}
        {!hasData && (
          <GettingStartedBanner balanceSet={startingBalance !== null} onSetBalance={() => setShowBalanceModal(true)} todayStatus={todayStatus} />
        )}

        {/* ══════ HERO OS CARD ══════ */}
        <div className="rounded-2xl border border-primary/10 bg-card shadow-lg shadow-primary/[0.03] overflow-hidden">
          <OSTabHeader activeStage={activeStage} stageStatus={stageStatus} onSelect={setStage} />

          <div className="p-5 md:p-8">
            {/* ── PLAN TAB ── */}
            {activeStage === "plan" && (
              <div className="space-y-5">
                <TodayVaultCheckCard
                  activePlan={activePlan} todayTradeCount={todayTradeCount} todayStatus={todayStatus} noTradeDay={noTradeDay}
                  onCheckTrade={() => navigate("/academy/vault")} onLogFromPlan={handleLogFromPlan} onLogUnplanned={handleLogUnplanned}
                  onCancelPlan={handleCancelPlan} onNoTradeDay={() => setShowNoTradeDay(true)}
                  onCompleteCheckIn={() => setShowCheckIn(true)}
                  onReviewFeedback={() => document.getElementById("ai-focus-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                />
                {/* Embedded Trade Planner */}
                {!activePlan && todayStatus !== "complete" && (
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pre-Trade Check</p>
                    <VaultTradePlanner />
                  </div>
                )}
              </div>
            )}

            {/* ── LIVE TAB ── */}
            {activeStage === "live" && (
              <div className="space-y-5">
                <TodaysLimitsSection />
                {activePlan && activePlan.status === "planned" && (
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-bold text-foreground">{activePlan.ticker || "—"}</span>
                        <span className="text-xs text-muted-foreground">{activePlan.direction === "calls" ? "Calls" : "Puts"} · {activePlan.contracts_planned}ct</span>
                      </div>
                      <Button size="sm" className="h-8 text-xs gap-1.5 rounded-full" onClick={() => handleLogFromPlan(activePlan)}>
                        <CheckCircle2 className="h-3 w-3" /> Log Result
                      </Button>
                    </div>
                  </div>
                )}
                {!activePlan && (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground mb-4">No active plan. Check a trade to get started.</p>
                    <Button size="sm" className="gap-1.5 rounded-full px-5" onClick={() => setStage("plan")}>
                      <Shield className="h-3.5 w-3.5" /> Go to Plan
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── REVIEW TAB ── */}
            {activeStage === "review" && (
              <div className="space-y-5">
                {todayStatus === "incomplete" && todayTradeCount === 0 && (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground mb-4">No trades logged today yet.</p>
                    <Button size="sm" className="gap-1.5 rounded-full px-5" onClick={handleLogUnplanned}>
                      <Plus className="h-3.5 w-3.5" /> Log a Trade
                    </Button>
                  </div>
                )}
                {(todayStatus === "in_progress" || (todayStatus === "incomplete" && todayTradeCount > 0)) && (
                  <div className="rounded-xl border border-border/30 bg-muted/10 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-foreground">Complete Your Session</h3>
                    <p className="text-xs text-muted-foreground">{todayTradeCount} trade{todayTradeCount > 1 ? "s" : ""} logged. Complete your check-in to close out today.</p>
                    <div className="flex gap-2.5">
                      <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setShowCheckIn(true)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete Check-In
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={handleLogUnplanned}>
                        <Plus className="h-3.5 w-3.5" /> Log Another
                      </Button>
                    </div>
                  </div>
                )}
                {todayStatus === "complete" && (
                  <div className="text-center py-10 space-y-2">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400 mx-auto" />
                    <p className="text-sm font-bold text-foreground">Session Complete</p>
                    <p className="text-xs text-muted-foreground">Today's accountability is done. Check your insights.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── INSIGHTS TAB ── */}
            {activeStage === "insights" && (
              <div className="space-y-5">
                <AIFocusCard entries={entries} />
              </div>
            )}
          </div>
        </div>

        {/* ══════ LOWER ANALYTICS ══════ */}
        <div className="space-y-3 pt-3">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/50 px-1">Analytics & History</p>

          {hasData && equityCurve.length > 1 && startingBalance !== null && (
            <EquityCurveCard equityCurve={equityCurve} startingBalance={startingBalance} />
          )}

          <RecentTradesSection entries={entries} onExportCSV={exportCSV} onDelete={async (id) => {
            const result = await deleteEntry(id);
            if (!result.error) refetchPlan();
            return result;
          }} />

          {hasData && symbolStats.length > 0 && (
            <PerformanceBreakdownCard symbolStats={symbolStats} dayStats={dayStats} />
          )}

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
      </div>

      {/* ── Modals ── */}
      <SetStartingBalanceModal open={showBalanceModal && startingBalance === null} onSave={handleStartingBalanceSave} onDismiss={handleBalanceDismiss} />
      <LogTradeSheet open={showLogTrade} onOpenChange={setShowLogTrade} onSubmit={handleTradeSubmit} planId={logPlanId} prefill={logPrefill} />
      <QuickCheckInSheet open={showCheckIn} onOpenChange={setShowCheckIn} onComplete={handleCheckInComplete} />
      <NoTradeDaySheet open={showNoTradeDay} onOpenChange={setShowNoTradeDay} onComplete={handleNoTradeDayComplete} />
    </>
  );
};

/* ── Metric Cell ── */
function MetricCell({ label, value, hero, color }: { label: string; value: string; hero?: boolean; color?: string }) {
  return (
    <div className={cn(
      "flex-1 min-w-0 border-r border-border/15 last:border-r-0",
      hero ? "px-4 md:px-5 py-3 md:py-4" : "px-3 md:px-4 py-3 md:py-4"
    )}>
      <p className="text-[9px] uppercase tracking-[0.12em] font-medium text-muted-foreground/50 leading-none mb-1">{label}</p>
      <p className={cn(
        "font-bold tabular-nums leading-none truncate",
        hero ? "text-lg md:text-xl text-primary" : "text-sm md:text-base",
        color || (!hero && "text-foreground")
      )}>
        {value}
      </p>
    </div>
  );
}

export default AcademyTrade;
