import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, ArrowUp, ArrowDown, Check, X, Sparkles, Star,
  AlertTriangle, Wallet, Target, ArrowRight, Crosshair,
  ChevronDown, Minus, Plus, Sliders, 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedPlans } from "@/hooks/useApprovedPlans";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useTradeLog } from "@/hooks/useTradeLog";
import { useVaultState } from "@/contexts/VaultStateContext";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateContractChoices,
  buildChoice,
  formatCurrency,
  type ContractChoice,
  type ApprovalResult,
} from "@/lib/vaultApprovalCalc";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const STATUS_CONFIG = {
  fits: {
    label: "FITS",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    ring: "ring-emerald-500/30",
    glow: "shadow-[0_0_16px_rgba(52,211,153,0.12)]",
    heroGlow: "shadow-[0_0_24px_rgba(52,211,153,0.08)]",
  },
  tight: {
    label: "TIGHT",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    ring: "ring-amber-500/30",
    glow: "shadow-[0_0_16px_rgba(251,191,36,0.1)]",
    heroGlow: "shadow-[0_0_24px_rgba(251,191,36,0.07)]",
  },
  pass: {
    label: "PASS",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    ring: "ring-red-500/30",
    glow: "",
    heroGlow: "",
  },
};

const CARD_SUBLABELS: Record<number, string> = {
  1: "Most room",
  2: "Balanced",
  3: "Tighter",
  4: "Max size",
};

export function VaultTradePlanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, status: accessStatus, loading: accessLoading } = useStudentAccess();
  const { activePlan, savePlan, replaceWithNew } = useApprovedPlans();
  const { totalPnl, refetch: refetchTrades } = useTradeLog();
  const { state: vaultState } = useVaultState();

  // Leak 1 fix: refetch trade data on mount to prevent stale balance
  useEffect(() => { refetchTrades(); }, []);

  const [direction, setDirection] = useState<"calls" | "puts">("calls");
  const [contractPrice, setContractPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingBalance, setStartingBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  const [customOpen, setCustomOpen] = useState(false);
  const [customContracts, setCustomContracts] = useState(5);
  const [customContractsText, setCustomContractsText] = useState("5");
  const [customExitOverride, setCustomExitOverride] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (!user) { setBalanceLoaded(true); return; }
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("account_balance").eq("user_id", user.id).maybeSingle();
        if (data && data.account_balance > 0) setStartingBalance(data.account_balance);
      } catch {}
      finally { setBalanceLoaded(true); }
    })();
  }, [user]);

  const accountBalance = useMemo(() => {
    if (startingBalance <= 0) return 0;
    return startingBalance + totalPnl;
  }, [startingBalance, totalPnl]);

  const tier = detectTier(accountBalance);
  const tierDefaults = TIER_DEFAULTS[tier];
  const tradeLossLimit = accountBalance * (tierDefaults.riskPercent / 100);

  const priceNum = parseFloat(contractPrice);
  const hasValidPrice = !isNaN(priceNum) && priceNum > 0;

  const result: ApprovalResult | null = useMemo(() => {
    if (!hasValidPrice || accountBalance <= 0) return null;
    return calculateContractChoices(accountBalance, priceNum);
  }, [accountBalance, priceNum, hasValidPrice]);

  // Custom size uses the same canonical buildChoice function
  const customChoice: ContractChoice | null = useMemo(() => {
    if (!hasValidPrice || accountBalance <= 0 || !result) return null;

    const exitOverrideNum = parseFloat(customExitOverride);
    const exitOverride = (!isNaN(exitOverrideNum) && exitOverrideNum > 0 && exitOverrideNum < priceNum)
      ? exitOverrideNum : null;

    const choice = buildChoice(
      priceNum, customContracts,
      result.riskBudget, result.comfortBudget, result.hardBudget,
      exitOverride,
    );

    // Override coaching note for custom
    if (choice.status === "fits") choice.coachingNote = "Custom size fits your account.";
    else if (choice.status === "tight") choice.coachingNote = "Custom size is tight. Discipline matters.";

    return choice;
  }, [hasValidPrice, accountBalance, priceNum, customContracts, customExitOverride, result]);

  const selectedChoice: ContractChoice | null = useMemo(() => {
    if (useCustom && customChoice) return customChoice;
    if (result && selectedIndex !== null) return result.choices[selectedIndex];
    return null;
  }, [useCustom, customChoice, result, selectedIndex]);

  useEffect(() => {
    if (result) {
      const recIdx = result.choices.findIndex((c) => c.isRecommended);
      if (recIdx >= 0) {
        setSelectedIndex(recIdx);
        setUseCustom(false);
      }
    }
  }, [result]);

  const buildPlanData = () => {
    if (!selectedChoice) return null;
    return {
      ticker: ticker.toUpperCase() || undefined,
      direction,
      entry_price_planned: priceNum,
      contracts_planned: selectedChoice.contracts,
      stop_price_planned: selectedChoice.exitPrice,
      max_loss_planned: selectedChoice.totalRisk,
      cash_needed_planned: selectedChoice.cashNeeded,
      tp1_planned: selectedChoice.tp1,
      tp2_planned: selectedChoice.tp2,
      approval_status: selectedChoice.status,
      account_balance_snapshot: accountBalance,
      trade_loss_limit_snapshot: tradeLossLimit,
      account_level_snapshot: tier,
    };
  };

  const handleUsePlan = async () => {
    const planData = buildPlanData();
    if (!planData || !selectedChoice) return;

    setSaving(true);
    const { data, error, hasExisting } = await savePlan(planData);

    if (hasExisting) {
      setSaving(false);
      setShowReplaceDialog(true);
      return;
    }

    if (error) {
      setSaving(false);
      toast({ title: "Error saving plan", description: "Please try again.", variant: "destructive" });
      return;
    }

    setSaving(false);
    toast({ title: "Plan approved", description: `${selectedChoice.contracts} contract${selectedChoice.contracts > 1 ? "s" : ""} approved. Head to My Trades to log the result.` });
    navigate("/academy/trade");
  };

  const handleReplacePlan = async () => {
    const planData = buildPlanData();
    if (!planData) return;

    setSaving(true);
    setShowReplaceDialog(false);
    const { error } = await replaceWithNew(planData);
    setSaving(false);

    if (error) {
      toast({ title: "Error saving plan", description: "Please try again.", variant: "destructive" });
      return;
    }

    toast({ title: "Plan replaced", description: "Previous plan cancelled. New plan approved." });
    navigate("/academy/trade");
  };

  if (!hasAccess && !accessLoading) return <PremiumGate status={accessStatus} pageName="VAULT Approval" />;

  if (!balanceLoaded || accessLoading) {
    return (
      <div className="space-y-3 max-w-5xl animate-pulse">
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-muted/30" />
          <div className="h-8 w-28 rounded-lg bg-muted/30" />
          <div className="h-8 w-20 rounded-lg bg-muted/30" />
        </div>
        <div className="h-64 rounded-xl bg-muted/20 border border-border/30" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 max-w-5xl">

        {/* ═══ RULES STRIP ═══ */}
        <div className="flex flex-wrap gap-2">
          <RulesChip icon={Wallet} label="Balance" value={`$${accountBalance.toLocaleString()}`} />
          <RulesChip icon={Shield} label="Loss Limit" value={formatCurrency(tradeLossLimit)} accent />
          <RulesChip
            icon={Target}
            label="Level"
            value={tier}
            valueCls={
              tier === "Large" ? "text-emerald-400" :
              tier === "Medium" ? "text-primary" :
              tier === "Small" ? "text-amber-400" :
              "text-red-400"
            }
          />
        </div>

        {/* No balance warning */}
        {accountBalance <= 0 && (
          <div className="vault-premium-card p-3 flex items-center gap-2.5" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-foreground flex-1">Set your account balance before checking trades.</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[11px] h-7 px-2.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => navigate("/academy/trade")}>
              Set Balance
            </Button>
          </div>
        )}

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: Trade Check Card */}
          <div className="lg:col-span-3 space-y-3">
            <div className="vault-premium-card overflow-hidden">
              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.4), transparent)' }} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 border border-primary/20">
                    <Crosshair className="h-3 w-3 text-primary" />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground tracking-tight uppercase">Trade Check</h3>
                </div>

                {/* Direction toggle */}
                <div className="flex rounded-xl border border-border/50 overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {(["calls", "puts"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-semibold transition-all duration-100 min-h-[42px]",
                        direction === d
                          ? d === "calls"
                            ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_0_-2px_0_0_rgba(52,211,153,0.5)]"
                            : "bg-red-500/15 text-red-400 shadow-[inset_0_-2px_0_0_rgba(239,68,68,0.5)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      {d === "calls" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      {d === "calls" ? "Calls" : "Puts"}
                    </button>
                  ))}
                </div>

                {/* Contract price + Ticker inline */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contract Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={contractPrice}
                        onChange={(e) => { setContractPrice(e.target.value); setSelectedIndex(null); setUseCustom(false); }}
                        className="pl-7 text-lg font-bold tabular-nums h-11 bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ticker <span className="text-muted-foreground/30">(opt)</span></Label>
                    <Input
                      placeholder="SPY"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      className="uppercase bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-lg h-11 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ CONTRACT CHOICE CARDS ═══ */}
            {result && (
              <div className="space-y-2.5">
                {result.allPass && (
                  <div className="vault-premium-card p-2.5 flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                    <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <p className="text-xs text-foreground">Too expensive for your account.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {result.choices.map((choice, idx) => {
                    const sc = STATUS_CONFIG[choice.status];
                    const isSelected = selectedIndex === idx && !useCustom;
                    return (
                      <button
                        key={idx}
                        onClick={() => { setSelectedIndex(idx); setUseCustom(false); }}
                        className={cn(
                          "vault-approval-choice-card relative text-left transition-all duration-100 active:scale-[0.97]",
                          "p-3 rounded-xl border border-white/[0.06]",
                          "hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
                          isSelected && `ring-2 ${sc.ring} ${sc.glow}`,
                          choice.isRecommended && !isSelected && "ring-1 ring-primary/30",
                          choice.status === "pass" && "opacity-35 saturate-50 hover:translate-y-0"
                        )}
                      >
                        {/* Recommended badge */}
                        {choice.isRecommended && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                            style={{
                              background: 'linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%))',
                              color: 'white',
                              boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}
                          >
                            <Star className="h-2.5 w-2.5" /> Recommended
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-2xl font-bold text-foreground tabular-nums leading-none">{choice.contracts}</span>
                          <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full border tracking-wider", sc.bg, sc.border, sc.color)}>
                            {sc.label}
                          </span>
                        </div>

                        <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.1em] font-medium mb-2">
                          {choice.contracts === 1 ? "contract" : "contracts"} · {CARD_SUBLABELS[choice.contracts] || ""}
                        </p>

                        <div className="space-y-1 pt-2 border-t border-white/[0.04]">
                          <MetricLine label="Cash" value={formatCurrency(choice.cashNeeded)} />
                          <MetricLine
                            label="Exit"
                            value={choice.fullPremiumRiskOk ? "Full OK" : choice.exitPrice ? formatCurrency(choice.exitPrice) : "—"}
                            valueCls={choice.fullPremiumRiskOk ? "text-emerald-400" : undefined}
                          />
                          <MetricLine label="Max loss" value={formatCurrency(choice.totalRisk)} valueCls="text-red-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ═══ CUSTOM SIZE ═══ */}
                <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 mx-auto px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide text-muted-foreground/70 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-foreground/80 active:scale-[0.97] transition-all duration-150">
                      <Sliders className="h-3 w-3" />
                      Custom Size
                      <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", customOpen && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="vault-glass-card p-3 mt-1.5 space-y-2.5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground font-medium">Contracts</Label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { const v = Math.max(1, customContracts - 1); setCustomContracts(v); setCustomContractsText(String(v)); }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                          >
                            <Minus className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={customContractsText}
                            onChange={(e) => { setCustomContractsText(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setCustomContracts(v); }}
                            onBlur={() => { if (!customContractsText || parseInt(customContractsText) < 1) { setCustomContracts(1); setCustomContractsText("1"); } }}
                            className="w-10 text-center text-base font-bold tabular-nums text-foreground bg-transparent border-b border-white/10 outline-none focus:border-primary/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => { const v = customContracts + 1; setCustomContracts(v); setCustomContractsText(String(v)); }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                          >
                            <Plus className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground font-medium shrink-0">Exit $</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Auto"
                          value={customExitOverride}
                          onChange={(e) => setCustomExitOverride(e.target.value)}
                          className="pl-3 h-8 text-xs bg-black/20 border-white/[0.06] rounded-lg flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-[11px] border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                          onClick={() => { setUseCustom(true); setSelectedIndex(null); }}
                        >
                          Use {customContracts}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

          {/* RIGHT: Hero Decision Card */}
          <div className="lg:col-span-2">
            <div className="sticky top-4">
              {selectedChoice ? (
              <HeroDecisionCard
                  choice={selectedChoice}
                  ticker={ticker}
                  direction={direction}
                  entryPrice={priceNum}
                  saving={saving}
                  onUsePlan={handleUsePlan}
                  
                />
              ) : (
                <div className="vault-premium-card p-6 text-center space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Shield className="h-5 w-5 text-muted-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasValidPrice ? "Tap a size to see the plan." : "Enter a price to start."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replace plan dialog */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace active plan?</AlertDialogTitle>
            <AlertDialogDescription>
              You already have an active approved plan today. Replacing it will cancel the existing one and create a new plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Current</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplacePlan}>Replace Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ── Hero Decision Card ── */
function HeroDecisionCard({
  choice, ticker, direction, entryPrice, saving, onUsePlan,
}: {
  choice: ContractChoice;
  ticker: string;
  direction: string;
  entryPrice: number;
  saving: boolean;
  onUsePlan: () => void;
}) {
  const sc = STATUS_CONFIG[choice.status];
  const hasExit = choice.exitPrice !== null || choice.fullPremiumRiskOk;

  return (
    <div className={cn("vault-premium-card overflow-hidden", sc.heroGlow)}>
      <div className="h-px" style={{
        background: choice.status === "fits"
          ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)"
          : choice.status === "tight"
          ? "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)"
          : "linear-gradient(90deg, transparent, rgba(239,68,68,0.25), transparent)"
      }} />

      <div className="p-4 space-y-3">
        {/* Status hero — compact */}
        <div className={cn("text-center py-4 rounded-xl relative overflow-hidden", sc.bg)}>
          <div className="absolute inset-0" style={{
            background: choice.status === "fits"
              ? "radial-gradient(circle at 50% 50%, rgba(52,211,153,0.08), transparent 70%)"
              : choice.status === "tight"
              ? "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.06), transparent 70%)"
              : "none"
          }} />
          <p className={cn("text-3xl font-black tracking-tight relative", sc.color)} style={{
            textShadow: choice.status === "fits"
              ? "0 0 30px rgba(52,211,153,0.25)"
              : choice.status === "tight"
              ? "0 0 30px rgba(251,191,36,0.2)"
              : "none"
          }}>
            {sc.label}
          </p>
          {ticker && (
            <p className="text-[11px] text-muted-foreground mt-1 relative font-medium">
              {ticker.toUpperCase()} · {direction === "calls" ? "Calls" : "Puts"}
            </p>
          )}
        </div>

        {/* Key details */}
        <div className="space-y-2">
          <HeroLine label="Buy" value={`${choice.contracts} contract${choice.contracts > 1 ? "s" : ""}`} bold />
          <HeroLine
            label="Exit if wrong"
            value={choice.fullPremiumRiskOk ? "Full risk OK" : choice.exitPrice ? formatCurrency(choice.exitPrice) : "—"}
            sub={choice.fullPremiumRiskOk ? "Risk budget covers the full contract." : undefined}
          />
          <HeroLine label="Cash needed" value={formatCurrency(choice.cashNeeded)} />
          <HeroLine label="Max loss" value={formatCurrency(choice.totalRisk)} valueCls="text-red-400" />
        </div>

        {/* Targets */}
        <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-wider">Targets</p>
          {hasExit && choice.riskPerContract > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              <TargetChip label="1:1" value={formatCurrency(choice.tp1)} />
              <TargetChip label="1:2" value={formatCurrency(choice.tp2)} />
              <TargetChip label="1:3" value={formatCurrency(choice.tp3)} />
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/40 italic">Add an exit to calculate targets</p>
          )}
        </div>

        {/* Coaching note */}
        <div className="flex items-start gap-2 rounded-lg p-2.5" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.06)' }}>
          <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-snug">{choice.coachingNote}</p>
        </div>

        {/* CTA */}
        <button
          className={cn(
            "vault-cta-shine w-full h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2.5 transition-all duration-100 active:scale-[0.97]",
            choice.status === "pass" || saving
              ? "bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
              : "text-white hover:brightness-110"
          )}
          style={choice.status !== "pass" && !saving ? {
            background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 42%))",
            boxShadow: "0 4px 20px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
          } : undefined}
          disabled={choice.status === "pass" || saving}
          onClick={onUsePlan}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            <>
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white/20">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              Use This Plan
              <ArrowRight className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </button>

        {choice.status === "pass" && (
          <p className="text-[10px] text-center text-muted-foreground/40">
            Doesn't fit your rules. Try a lower price.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function RulesChip({ icon: Icon, label, value, valueCls, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueCls?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-xl px-3 py-2 min-h-[36px]",
      accent ? "vault-premium-card" : "vault-glass-card"
    )}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums text-foreground", valueCls)}>{value}</span>
    </div>
  );
}

function MetricLine({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground/60">{label}</span>
      <span className={cn("text-xs font-bold tabular-nums text-foreground", valueCls)}>{value}</span>
    </div>
  );
}

function HeroLine({ label, value, bold, valueCls, sub }: {
  label: string;
  value: string;
  bold?: boolean;
  valueCls?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground/60 font-medium">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm tabular-nums text-foreground", bold && "font-bold", valueCls)}>{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground/40 mt-px max-w-[180px]">{sub}</p>}
      </div>
    </div>
  );
}

function TargetChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg py-1.5 px-2 text-center" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.08)' }}>
      <p className="text-[9px] text-emerald-400/60 font-semibold">{label}</p>
      <p className="text-[11px] text-emerald-400 font-bold tabular-nums">{value}</p>
    </div>
  );
}
