import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, ArrowUp, ArrowDown, Check, X, Sparkles, Star,
  AlertTriangle, Wallet, Target, ArrowRight, Crosshair,
  ChevronDown, Minus, Plus, Sliders, 
} from "lucide-react";
import { RiskRewardVisualizer } from "./RiskRewardVisualizer";
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

interface VaultTradePlannerProps {
  balanceOverride?: number | null;
  activePlanOverride?: any;
  savePlanOverride?: any;
  replaceWithNewOverride?: any;
  onPlanSaved?: () => void;
  /** When true, strips card wrappers and compresses for embedding inside OS */
  embedded?: boolean;
  /** User-selected risk percent (1-3). Overrides tier default. */
  riskPercentOverride?: number | null;
}

export function VaultTradePlanner({ balanceOverride, activePlanOverride, savePlanOverride, replaceWithNewOverride, onPlanSaved, embedded = false }: VaultTradePlannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, status: accessStatus, loading: accessLoading } = useStudentAccess();
  const internalPlans = useApprovedPlans();
  const internalTradeLog = useTradeLog();
  const { state: vaultState } = useVaultState();

  const activePlan = activePlanOverride !== undefined ? activePlanOverride : internalPlans.activePlan;
  const savePlan = savePlanOverride || internalPlans.savePlan;
  const replaceWithNew = replaceWithNewOverride || internalPlans.replaceWithNew;
  const totalPnl = internalTradeLog.totalPnl;

  useEffect(() => { if (balanceOverride === undefined) internalTradeLog.refetch(); }, []);

  const [direction, setDirection] = useState<"calls" | "puts">("calls");
  const [contractPrice, setContractPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingBalance, setStartingBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(balanceOverride !== undefined);

  const [customOpen, setCustomOpen] = useState(false);
  const [customContracts, setCustomContracts] = useState(5);
  const [customContractsText, setCustomContractsText] = useState("5");
  const [customExitOverride, setCustomExitOverride] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (balanceOverride !== undefined) { setBalanceLoaded(true); return; }
    if (!user) { setBalanceLoaded(true); return; }
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("account_balance").eq("user_id", user.id).maybeSingle();
        if (data && data.account_balance > 0) setStartingBalance(data.account_balance);
      } catch {}
      finally { setBalanceLoaded(true); }
    })();
  }, [user, balanceOverride]);

  const accountBalance = useMemo(() => {
    if (balanceOverride !== undefined && balanceOverride !== null) return balanceOverride;
    if (startingBalance <= 0) return 0;
    return startingBalance + totalPnl;
  }, [balanceOverride, startingBalance, totalPnl]);

  const tier = detectTier(accountBalance);
  const tierDefaults = TIER_DEFAULTS[tier];
  const tradeLossLimit = accountBalance * (tierDefaults.riskPercent / 100);

  const priceNum = parseFloat(contractPrice);
  const hasValidPrice = !isNaN(priceNum) && priceNum > 0;

  const result: ApprovalResult | null = useMemo(() => {
    if (!hasValidPrice || accountBalance <= 0) return null;
    return calculateContractChoices(accountBalance, priceNum);
  }, [accountBalance, priceNum, hasValidPrice]);

  const customChoice: ContractChoice | null = useMemo(() => {
    if (!hasValidPrice || accountBalance <= 0 || !result) return null;
    const exitOverrideNum = parseFloat(customExitOverride);
    const exitOverride = (!isNaN(exitOverrideNum) && exitOverrideNum > 0 && exitOverrideNum < priceNum)
      ? exitOverrideNum : null;
    const choice = buildChoice(priceNum, customContracts, result.riskBudget, result.comfortBudget, result.hardBudget, exitOverride);
    if (choice.status === "fits") choice.coachingNote = "Custom size fits your account.";
    else if (choice.status === "tight") choice.coachingNote = "Custom size is tight. Discipline matters.";
    return choice;
  }, [hasValidPrice, accountBalance, priceNum, customContracts, customExitOverride, result]);

  const selectedChoice: ContractChoice | null = useMemo(() => {
    if (useCustom && customChoice) return customChoice;
    if (result && selectedIndex !== null) return result.choices[selectedIndex];
    return null;
  }, [useCustom, customChoice, result, selectedIndex]);

  const [autoSelectPulse, setAutoSelectPulse] = useState(false);

  useEffect(() => {
    if (!result) return;
    // Smart auto-select: recommended first, else first non-pass
    const recIdx = result.choices.findIndex((c) => c.isRecommended);
    if (recIdx >= 0) {
      setSelectedIndex(recIdx); setUseCustom(false);
    } else {
      const firstFit = result.choices.findIndex((c) => c.status !== "pass");
      if (firstFit >= 0) { setSelectedIndex(firstFit); setUseCustom(false); }
    }
    // Trigger pulse animation on auto-select
    setAutoSelectPulse(true);
    const t = setTimeout(() => setAutoSelectPulse(false), 600);
    return () => clearTimeout(t);
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
    if (hasExisting) { setSaving(false); setShowReplaceDialog(true); return; }
    if (error) { setSaving(false); toast({ title: "Error saving plan", description: "Please try again.", variant: "destructive" }); return; }
    setSaving(false);
    toast({ title: "Plan approved", description: `${selectedChoice.contracts} contract${selectedChoice.contracts > 1 ? "s" : ""} approved.` });
    if (onPlanSaved) onPlanSaved();
    else navigate("/academy/trade");
  };

  const handleReplacePlan = async () => {
    const planData = buildPlanData();
    if (!planData) return;
    setSaving(true);
    setShowReplaceDialog(false);
    const { error } = await replaceWithNew(planData);
    setSaving(false);
    if (error) { toast({ title: "Error saving plan", description: "Please try again.", variant: "destructive" }); return; }
    toast({ title: "Plan replaced", description: "Previous plan cancelled. New plan approved." });
    if (onPlanSaved) onPlanSaved();
    else navigate("/academy/trade");
  };

  if (!hasAccess && !accessLoading) return <PremiumGate status={accessStatus} pageName="VAULT Approval" />;

  if (!balanceLoaded || accessLoading) {
    return (
      <div className="space-y-3 max-w-5xl animate-pulse">
        <div className="flex gap-2">
          <div className="h-7 w-24 rounded-lg bg-muted/30" />
          <div className="h-7 w-24 rounded-lg bg-muted/30" />
          <div className="h-7 w-16 rounded-lg bg-muted/30" />
        </div>
        <div className="h-48 rounded-lg bg-muted/20 border border-border/30" />
      </div>
    );
  }

  // Shared sizing classes based on embedded mode
  const cardRadius = embedded ? "rounded-lg" : "rounded-xl";
  const inputHeight = embedded ? "h-9" : "h-11";
  const dirMinH = embedded ? "min-h-[36px]" : "min-h-[42px]";
  const dirPy = embedded ? "py-1.5" : "py-2.5";
  const dirText = embedded ? "text-xs" : "text-[13px]";
  const gridGap = embedded ? "gap-2" : "gap-4";
  const choicePad = embedded ? "p-2" : "p-3";
  const choiceNumText = embedded ? "text-lg" : "text-2xl";

  return (
    <>
      <div className={cn("space-y-2.5", !embedded && "max-w-5xl")}>

        {/* ═══ RULES STRIP ═══ (hidden in embedded — redundant with command bar) */}
        {!embedded && (
          <div className="flex flex-wrap gap-1.5">
            <RulesChip icon={Wallet} label="Balance" value={`$${accountBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} embedded={embedded} />
            <RulesChip icon={Shield} label="Loss Limit" value={formatCurrency(tradeLossLimit)} accent embedded={embedded} />
            <RulesChip
              icon={Target}
              label="Level"
              value={tier}
              embedded={embedded}
              valueCls={
                tier === "Large" ? "text-emerald-400" :
                tier === "Medium" ? "text-primary" :
                tier === "Small" ? "text-amber-400" :
                "text-red-400"
              }
            />
          </div>
        )}

        {/* No balance warning */}
        {accountBalance <= 0 && (
          <div className={cn("p-2.5 flex items-center gap-2", embedded ? "rounded-lg border border-amber-500/15 bg-amber-500/[0.04]" : "vault-premium-card")} style={!embedded ? { borderColor: 'rgba(251,191,36,0.15)' } : undefined}>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[11px] text-foreground flex-1">Set your account balance before checking trades.</p>
            <Button size="sm" variant="outline" className="shrink-0 text-[10px] h-6 px-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => navigate("/academy/trade")}>
              Set Balance
            </Button>
          </div>
        )}

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div className={cn("grid grid-cols-1 lg:grid-cols-5", gridGap)}>
          {/* LEFT: Trade Check */}
          <div className="lg:col-span-3 space-y-2">
            {embedded ? (
              /* Embedded: flat, no card wrapper */
              <div className="space-y-2">
                {/* Direction toggle */}
                <div className={cn("flex rounded-lg border border-border/50 overflow-hidden")} style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {(["calls", "puts"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2.5 text-xs font-semibold transition-all duration-100",
                        dirMinH, dirPy,
                        direction === d
                          ? d === "calls"
                            ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_0_-2px_0_0_rgba(52,211,153,0.5)]"
                            : "bg-red-500/15 text-red-400 shadow-[inset_0_-2px_0_0_rgba(239,68,68,0.5)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      {d === "calls" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {d === "calls" ? "Calls" : "Puts"}
                    </button>
                  ))}
                </div>

                {/* Inputs */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="col-span-2 space-y-0.5">
                    <Label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Contract Price</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">$</span>
                      <Input
                        type="number" step="0.01" min="0.01" placeholder="0.00"
                        value={contractPrice}
                        onChange={(e) => { setContractPrice(e.target.value); setSelectedIndex(null); setUseCustom(false); }}
                        className={cn("pl-6 text-base font-bold tabular-nums bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-lg", inputHeight)}
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Ticker</Label>
                    <Input
                      placeholder="SPY"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      className={cn("uppercase bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-lg text-sm", inputHeight)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Standalone: full card wrapper */
              <div className="vault-premium-card overflow-hidden">
                <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.4), transparent)' }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary/10 border border-primary/20">
                      <Crosshair className="h-3 w-3 text-primary" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground tracking-tight uppercase">Trade Check</h3>
                  </div>

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

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Contract Price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">$</span>
                        <Input
                          type="number" step="0.01" min="0.01" placeholder="0.00"
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
            )}

            {/* ═══ CONTRACT CHOICE CARDS ═══ */}
            {result && (
              <div className="space-y-2">
                {result.allPass && (
                  <div className={cn("p-2 flex items-center gap-2 rounded-lg border border-red-500/15 bg-red-500/[0.04]", !embedded && "vault-premium-card")} style={!embedded ? { borderColor: 'rgba(239,68,68,0.15)' } : undefined}>
                    <X className="h-3 w-3 text-red-400 shrink-0" />
                    <p className="text-[11px] text-foreground">Too expensive for your account.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {result.choices.map((choice, idx) => {
                    const sc = STATUS_CONFIG[choice.status];
                    const isSelected = selectedIndex === idx && !useCustom;
                    return (
                      <button
                        key={idx}
                        onClick={() => { setSelectedIndex(idx); setUseCustom(false); }}
                        className={cn(
                          "relative text-left transition-all duration-100 active:scale-[0.97]",
                          choicePad, cardRadius,
                          embedded
                            ? "border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                            : "vault-approval-choice-card hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
                          isSelected && `ring-2 ${sc.ring} ${sc.glow}`,
                          isSelected && autoSelectPulse && "animate-[pulse_0.5s_ease-in-out]",
                          choice.isRecommended && !isSelected && "ring-1 ring-primary/30",
                          choice.status === "pass" && "opacity-35 saturate-50 hover:translate-y-0"
                        )}
                      >
                        {choice.isRecommended && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
                            style={{
                              background: 'linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%))',
                              color: 'white',
                              boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                            }}
                          >
                            <Star className="h-2 w-2" /> Best
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn("font-bold text-foreground tabular-nums leading-none", choiceNumText)}>
                            {choice.contracts}<span className="text-[9px] font-semibold text-muted-foreground ml-0.5">CON</span>
                          </span>
                          <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border tracking-wider", sc.bg, sc.border, sc.color)}>
                            {sc.label}
                          </span>
                        </div>

                        {!embedded && (
                          <>
                            <p className="text-[10px] text-muted-foreground/40 leading-snug mb-0.5">
                              {choice.status === "fits" && "Fits your risk rules."}
                              {choice.status === "tight" && "Near your limits."}
                              {choice.status === "pass" && "Exceeds your rules."}
                            </p>
                            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-medium mb-1.5">
                              {CARD_SUBLABELS[choice.contracts] || ""}
                            </p>
                          </>
                        )}

                        <div className={cn("space-y-0.5", embedded ? "pt-1 border-t border-white/[0.04]" : "pt-2 border-t border-white/[0.04]")}>
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
                    <button className="flex items-center gap-1.5 mx-auto px-3 py-1 rounded-full text-[10px] font-medium tracking-wide text-muted-foreground/70 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-foreground/80 active:scale-[0.97] transition-all duration-150">
                      <Sliders className="h-2.5 w-2.5" />
                      Custom Size
                      <ChevronDown className={cn("h-2.5 w-2.5 transition-transform duration-200", customOpen && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className={cn("mt-1.5 space-y-2", embedded ? "rounded-lg border border-white/[0.06] bg-white/[0.02] p-2" : "vault-glass-card p-3 rounded-lg")}>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground font-medium">Contracts</Label>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { const v = Math.max(1, customContracts - 1); setCustomContracts(v); setCustomContractsText(String(v)); }}
                            className="h-6 w-6 rounded-md flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                          >
                            <Minus className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                          <input
                            type="number" min={1}
                            value={customContractsText}
                            onChange={(e) => { setCustomContractsText(e.target.value); const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setCustomContracts(v); }}
                            onBlur={() => { if (!customContractsText || parseInt(customContractsText) < 1) { setCustomContracts(1); setCustomContractsText("1"); } }}
                            className="w-8 text-center text-sm font-bold tabular-nums text-foreground bg-transparent border-b border-white/10 outline-none focus:border-primary/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => { const v = customContracts + 1; setCustomContracts(v); setCustomContractsText(String(v)); }}
                            className="h-6 w-6 rounded-md flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
                          >
                            <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[9px] text-muted-foreground font-medium shrink-0">Exit $</Label>
                        <Input
                          type="number" step="0.01" placeholder="Auto"
                          value={customExitOverride}
                          onChange={(e) => setCustomExitOverride(e.target.value)}
                          className="pl-2.5 h-7 text-xs bg-black/20 border-white/[0.06] rounded-md flex-1"
                        />
                        <Button
                          variant="outline" size="sm"
                          className="h-7 px-2.5 text-[10px] border-primary/30 text-primary hover:bg-primary/10 shrink-0"
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
                  embedded={embedded}
                />
              ) : (
                <div className={cn(embedded ? "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4" : "vault-premium-card p-6", "text-center space-y-2")}>
                  <div className={cn("mx-auto rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center", embedded ? "h-8 w-8" : "h-10 w-10")}>
                    <Shield className={cn("text-muted-foreground/20", embedded ? "h-4 w-4" : "h-5 w-5")} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {hasValidPrice ? "Tap a size to see the plan." : "Enter a price to start."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
  choice, ticker, direction, entryPrice, saving, onUsePlan, embedded = false,
}: {
  choice: ContractChoice;
  ticker: string;
  direction: string;
  entryPrice: number;
  saving: boolean;
  onUsePlan: () => void;
  embedded?: boolean;
}) {
  const sc = STATUS_CONFIG[choice.status];
  const hasExit = choice.exitPrice !== null || choice.fullPremiumRiskOk;

  return (
    <div className={cn(
      embedded ? "rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden" : cn("vault-premium-card overflow-hidden", sc.heroGlow)
    )}>
      {!embedded && (
        <div className="h-px" style={{
          background: choice.status === "fits"
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.5), transparent)"
            : choice.status === "tight"
            ? "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)"
            : "linear-gradient(90deg, transparent, rgba(239,68,68,0.25), transparent)"
        }} />
      )}

      <div className={cn("space-y-2.5", embedded ? "p-3" : "p-4 space-y-3")}>
        {/* Status hero */}
        <div className={cn("text-center rounded-lg relative overflow-hidden", sc.bg, embedded ? "py-2.5" : "py-4")}>
          {!embedded && (
            <div className="absolute inset-0" style={{
              background: choice.status === "fits"
                ? "radial-gradient(circle at 50% 50%, rgba(52,211,153,0.08), transparent 70%)"
                : choice.status === "tight"
                ? "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.06), transparent 70%)"
                : "none"
            }} />
          )}
          <p className={cn("font-black tracking-tight relative", sc.color, embedded ? "text-2xl" : "text-3xl")} style={!embedded ? {
            textShadow: choice.status === "fits"
              ? "0 0 30px rgba(52,211,153,0.25)"
              : choice.status === "tight"
              ? "0 0 30px rgba(251,191,36,0.2)"
              : "none"
          } : undefined}>
            {sc.label}
          </p>
          {ticker && (
            <p className="text-[10px] text-muted-foreground mt-0.5 relative font-medium">
              {ticker.toUpperCase()} · {direction === "calls" ? "Calls" : "Puts"}
            </p>
          )}
        </div>

        {/* Key details */}
        <div className="space-y-1.5">
          <HeroLine label="Buy" value={`${choice.contracts} contract${choice.contracts > 1 ? "s" : ""}`} bold />
          <HeroLine
            label="Exit if wrong"
            value={choice.fullPremiumRiskOk ? "Full risk OK" : choice.exitPrice ? formatCurrency(choice.exitPrice) : "—"}
            sub={choice.fullPremiumRiskOk ? "Risk budget covers full contract." : undefined}
          />
          <HeroLine label="Cash needed" value={formatCurrency(choice.cashNeeded)} />
          <HeroLine label="Max loss" value={formatCurrency(choice.totalRisk)} valueCls="text-red-400" />
        </div>

        {/* R:R Visualizer — Collapsible */}
        {hasExit && choice.riskPerContract > 0 ? (
          <RRCollapsible
            choice={choice}
            entryPrice={entryPrice}
            ticker={ticker}
            direction={direction}
          />
        ) : (
          <div className="pt-1.5 border-t border-white/[0.04]">
            <p className="text-[10px] text-muted-foreground/40 italic">Add an exit to calculate targets & R:R</p>
          </div>
        )}

        {/* Coaching note */}
        <div className="flex items-start gap-1.5 rounded-lg p-2" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.06)' }}>
          <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-snug">{choice.coachingNote}</p>
        </div>

        {/* Decision framing */}
        <div className="rounded-lg p-2 bg-white/[0.02] border border-white/[0.04]">
          <p className="text-[10px] text-muted-foreground/70 leading-snug">
            {choice.status === "fits" && "✓ This trade fits your rules. You're cleared to execute."}
            {choice.status === "tight" && "⚠ Near your risk limit. Stick to your stop — discipline matters."}
            {choice.status === "pass" && "✗ Exceeds your risk rules. Reduce size or find a lower entry."}
          </p>
        </div>

        {/* CTA */}
        <button
          className={cn(
            "vault-cta-shine w-full rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all duration-100 active:scale-[0.97]",
            embedded ? "h-9" : "h-11",
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
              <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving…
            </span>
          ) : (
            <>
              <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-white/20">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              Use This Plan & Begin
              <ArrowRight className="h-3 w-3 opacity-50" />
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
function RulesChip({ icon: Icon, label, value, valueCls, accent, embedded }: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueCls?: string;
  accent?: boolean;
  embedded?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5",
      embedded
        ? "rounded-lg px-2 py-1 min-h-[28px] border border-white/[0.06] bg-white/[0.02]"
        : cn("rounded-xl px-3 py-2 min-h-[36px]", accent ? "vault-premium-card" : "vault-glass-card")
    )}>
      <Icon className={cn("shrink-0", embedded ? "h-3 w-3 text-muted-foreground/60" : "h-3.5 w-3.5 text-muted-foreground")} />
      <span className={cn("font-medium text-muted-foreground", embedded ? "text-[9px]" : "text-[10px]")}>{label}</span>
      <span className={cn("font-bold tabular-nums text-foreground", valueCls, embedded ? "text-xs" : "text-sm")}>{value}</span>
    </div>
  );
}

function MetricLine({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] text-muted-foreground/60">{label}</span>
      <span className={cn("text-[11px] font-bold tabular-nums text-foreground", valueCls)}>{value}</span>
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
      <span className="text-[11px] text-muted-foreground/60 font-medium">{label}</span>
      <div className="text-right">
        <span className={cn("text-xs tabular-nums text-foreground", bold && "font-bold", valueCls)}>{value}</span>
        {sub && <p className="text-[9px] text-muted-foreground/40 mt-px max-w-[160px]">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Collapsible R:R wrapper ── */
function RRCollapsible({ choice, entryPrice, ticker, direction }: {
  choice: ContractChoice; entryPrice: number; ticker: string; direction: string;
}) {
  const [open, setOpen] = useState(false);
  const totalRisk = choice.riskPerContract * 100 * choice.contracts;
  const defaultProfit = totalRisk * 2; // 1:2

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="pt-1.5 border-t border-white/[0.04]">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-1.5 px-1 rounded-md hover:bg-white/[0.03] transition-colors group">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[10px] font-semibold text-muted-foreground">R:R</span>
              <span className="text-[11px] font-bold text-foreground tabular-nums">1:2</span>
              <span className="text-[10px] text-emerald-400 font-semibold tabular-nums">→ +${defaultProfit.toFixed(0)}</span>
            </div>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 transition-transform duration-200", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-1">
            <RiskRewardVisualizer
              riskPerContract={choice.riskPerContract}
              contractPrice={entryPrice}
              contracts={choice.contracts}
              tp1={choice.tp1}
              tp2={choice.tp2}
              tp3={choice.tp3}
              exitPrice={choice.exitPrice}
              ticker={ticker}
              direction={direction}
              fullPremiumRiskOk={choice.fullPremiumRiskOk}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TargetChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md py-1 px-1.5 text-center" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.08)' }}>
      <p className="text-[8px] text-emerald-400/60 font-semibold">{label}</p>
      <p className="text-[10px] text-emerald-400 font-bold tabular-nums">{value}</p>
    </div>
  );
}
