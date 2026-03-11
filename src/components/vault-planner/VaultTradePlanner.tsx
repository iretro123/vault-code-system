import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, ArrowUp, ArrowDown, Check, X, Sparkles, Star,
  AlertTriangle, Wallet, Target, ChevronRight, Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedPlans } from "@/hooks/useApprovedPlans";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useTradeLog } from "@/hooks/useTradeLog";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateContractChoices,
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

const STATUS_CONFIG = {
  fits: {
    label: "FITS",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    ring: "ring-emerald-500/30",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]",
    heroGlow: "shadow-[0_0_40px_rgba(52,211,153,0.12),inset_0_1px_0_rgba(52,211,153,0.1)]",
  },
  tight: {
    label: "TIGHT",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    ring: "ring-amber-500/30",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.12)]",
    heroGlow: "shadow-[0_0_40px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(251,191,36,0.08)]",
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

export function VaultTradePlanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess, status: accessStatus, loading: accessLoading } = useStudentAccess();
  const { activePlan, savePlan, replaceWithNew } = useApprovedPlans();
  const { totalPnl } = useTradeLog();

  // Inputs
  const [direction, setDirection] = useState<"calls" | "puts">("calls");
  const [contractPrice, setContractPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingBalance, setStartingBalance] = useState(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  // Fetch starting balance from profile, then compute live balance
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

  // Live tracked balance = starting balance + total P/L from all trades
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

  const selectedChoice: ContractChoice | null = result && selectedIndex !== null ? result.choices[selectedIndex] : null;

  // Auto-select recommended choice when results change
  useMemo(() => {
    if (result) {
      const recIdx = result.choices.findIndex((c) => c.isRecommended);
      if (recIdx >= 0 && selectedIndex === null) setSelectedIndex(recIdx);
    }
  }, [result]);

  const buildPlanData = () => {
    if (!selectedChoice) return null;
    return {
      ticker: ticker.toUpperCase() || undefined,
      direction,
      entry_price_planned: priceNum,
      contracts_planned: selectedChoice.contracts,
      stop_price_planned: selectedChoice.suggestedExit,
      max_loss_planned: selectedChoice.worstCaseLoss,
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

  return (
    <>
      <div className="space-y-6 max-w-5xl">
        {/* ═══ RULES STRIP ═══ */}
        <div className="flex flex-wrap gap-3">
          <RulesChip icon={Wallet} label="Live Balance" value={`$${accountBalance.toLocaleString()}`} />
          <RulesChip icon={Shield} label="Trade Loss Limit" value={formatCurrency(tradeLossLimit)} accent />
          <RulesChip
            icon={Target}
            label="Account Level"
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
          <div className="vault-premium-card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-amber-500/10 shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Set your account balance first</p>
              <p className="text-xs text-muted-foreground mt-0.5">Go to My Trades and set your starting balance before checking trades.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => navigate("/academy/trade")}>
              Set Balance
            </Button>
          </div>
        )}

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Trade Check Card */}
          <div className="lg:col-span-3 space-y-6">
            {/* Trade Check Input Card */}
            <div className="vault-premium-card overflow-hidden">
              {/* Card header with gradient line */}
              <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, hsl(217 91% 60% / 0.5), transparent)' }} />
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10 border border-primary/20">
                    <Crosshair className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Trade Check</h3>
                </div>

                {/* Direction toggle */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Direction</Label>
                  <div className="flex rounded-2xl border border-border/50 overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                {(["calls", "puts"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDirection(d)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2.5 px-4 py-4 text-[15px] font-semibold transition-all duration-150 min-h-[52px]",
                          direction === d
                            ? d === "calls"
                              ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_0_-2px_0_0_rgba(52,211,153,0.5)]"
                              : "bg-red-500/15 text-red-400 shadow-[inset_0_-2px_0_0_rgba(239,68,68,0.5)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                        )}
                      >
                        {d === "calls" ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                        {d === "calls" ? "Up (Calls)" : "Down (Puts)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contract price */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contract Price</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                     <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={contractPrice}
                      onChange={(e) => { setContractPrice(e.target.value); setSelectedIndex(null); }}
                      className="pl-8 text-2xl font-bold tabular-nums h-16 bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl"
                    />
                  </div>
                </div>

                {/* Ticker */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ticker <span className="text-muted-foreground/40">(optional)</span></Label>
                   <Input
                    placeholder="SPY, TSLA, NVDA…"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="uppercase bg-black/20 border-white/[0.06] focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl h-12 text-base"
                  />
                </div>
              </div>
            </div>

            {/* ═══ CONTRACT CHOICE CARDS ═══ */}
            {result && (
              <div className="space-y-4">
                {result.allPass && (
                  <div className="vault-premium-card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                    <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-red-500/10 shrink-0">
                      <X className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-sm text-foreground">This contract is too expensive for your account.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {result.choices.map((choice, idx) => {
                    const sc = STATUS_CONFIG[choice.status];
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={cn(
                          "vault-approval-choice-card relative text-left space-y-3 transition-all duration-150 active:scale-[0.97] min-h-[160px]",
                          "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                          isSelected && `ring-2 ${sc.ring} ${sc.glow} scale-[1.02]`,
                          choice.isRecommended && !isSelected && "ring-1 ring-primary/30",
                          choice.status === "pass" && "opacity-40 saturate-50 hover:translate-y-0"
                        )}
                      >
                        {/* Best badge */}
                        {choice.isRecommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse"
                            style={{
                              background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 50%))',
                              color: 'white',
                              boxShadow: '0 2px 16px rgba(59,130,246,0.35)',
                            }}
                          >
                            <Star className="h-3 w-3" /> Best
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-foreground tabular-nums">{choice.contracts}</span>
                          <span className={cn("text-[11px] font-bold px-3 py-1.5 rounded-full border tracking-wider", sc.bg, sc.border, sc.color)}>
                            {sc.label}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.15em] font-medium">
                          {choice.contracts === 1 ? "contract" : "contracts"}
                        </p>

                        <div className="space-y-2.5 pt-3 border-t border-white/[0.05]">
                          <MetricLine label="Cash needed" value={formatCurrency(choice.cashNeeded)} />
                          <MetricLine
                            label="Exit if wrong"
                            value={choice.fullPremiumRiskOk ? "Full risk OK" : choice.suggestedExit ? formatCurrency(choice.suggestedExit) : "—"}
                            valueCls={choice.fullPremiumRiskOk ? "text-emerald-400" : undefined}
                          />
                          <MetricLine label="Max loss" value={formatCurrency(choice.worstCaseLoss)} valueCls="text-red-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                  saving={saving}
                  onUsePlan={handleUsePlan}
                />
              ) : (
                <div className="vault-premium-card p-8 text-center space-y-4">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Shield className="h-7 w-7 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {hasValidPrice ? "Tap a contract choice to see the full plan." : "Enter a contract price to get started."}
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
  choice, ticker, direction, saving, onUsePlan,
}: {
  choice: ContractChoice;
  ticker: string;
  direction: string;
  saving: boolean;
  onUsePlan: () => void;
}) {
  const sc = STATUS_CONFIG[choice.status];

  return (
    <div className={cn("vault-premium-card overflow-hidden", sc.heroGlow)}>
      {/* Top gradient line */}
      <div className="h-[2px]" style={{
        background: choice.status === "fits"
          ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.6), transparent)"
          : choice.status === "tight"
          ? "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)"
          : "linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)"
      }} />

      <div className="p-6 space-y-5">
        {/* Status hero */}
        <div className={cn("text-center py-5 rounded-2xl relative overflow-hidden", sc.bg)}>
          {/* Radial glow behind status text */}
          <div className="absolute inset-0" style={{
            background: choice.status === "fits"
              ? "radial-gradient(circle at 50% 50%, rgba(52,211,153,0.08), transparent 70%)"
              : choice.status === "tight"
              ? "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.06), transparent 70%)"
              : "none"
          }} />
          <p className={cn("text-4xl font-black tracking-tight relative", sc.color)} style={{
            textShadow: choice.status === "fits"
              ? "0 0 30px rgba(52,211,153,0.25)"
              : choice.status === "tight"
              ? "0 0 30px rgba(251,191,36,0.2)"
              : "none"
          }}>
            {sc.label}
          </p>
          {ticker && (
            <p className="text-xs text-muted-foreground mt-1.5 relative">
              {ticker.toUpperCase()} · {direction === "calls" ? "Calls" : "Puts"}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <HeroLine label="Buy" value={`${choice.contracts} contract${choice.contracts > 1 ? "s" : ""}`} bold />
          <HeroLine
            label="Exit if wrong"
            value={choice.fullPremiumRiskOk ? "Full premium risk OK" : choice.suggestedExit ? formatCurrency(choice.suggestedExit) : "—"}
            sub={choice.fullPremiumRiskOk ? "Your risk budget covers the entire contract." : undefined}
          />
          <HeroLine label="Cash needed" value={formatCurrency(choice.cashNeeded)} />
          <HeroLine label="Max loss" value={formatCurrency(choice.worstCaseLoss)} valueCls="text-red-400" />

          <div className="pt-3 border-t border-white/[0.04] space-y-3">
            <HeroLine label="Take profit 1" value={formatCurrency(choice.tp1)} valueCls="text-emerald-400" />
            <HeroLine label="Take profit 2" value={formatCurrency(choice.tp2)} valueCls="text-emerald-400" />
          </div>
        </div>

        {/* Coaching note */}
        <div className="flex items-start gap-2.5 rounded-2xl p-3.5" style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}>
          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">{choice.coachingNote}</p>
        </div>

        {/* CTA */}
        <button
          className={cn(
            "w-full h-13 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all duration-100 active:scale-[0.98]",
            choice.status === "pass" || saving
              ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
              : "text-white"
          )}
          style={choice.status !== "pass" && !saving ? {
            background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%))",
            boxShadow: "0 4px 20px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
          } : undefined}
          disabled={choice.status === "pass" || saving}
          onClick={onUsePlan}
        >
          {saving ? "Saving…" : (
            <>
              <Check className="h-4 w-4" /> Use This Plan
              <ChevronRight className="h-4 w-4 ml-auto" />
            </>
          )}
        </button>

        {choice.status === "pass" && (
          <p className="text-[10px] text-center text-muted-foreground/60">
            This setup doesn't fit your account rules. Try a lower contract price.
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
      "flex items-center gap-2.5 rounded-2xl px-4 py-2.5",
      accent ? "vault-premium-card" : "vault-glass-card"
    )}>
      <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.04]">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums text-foreground", valueCls)}>{value}</span>
    </div>
  );
}

function MetricLine({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground/70">{label}</span>
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
      <span className="text-xs text-muted-foreground/70 font-medium">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm tabular-nums text-foreground", bold && "font-bold", valueCls)}>{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground/50 mt-0.5 max-w-[180px]">{sub}</p>}
      </div>
    </div>
  );
}
