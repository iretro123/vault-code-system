import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowUp, ArrowDown, Check, X, Sparkles, Star,
  AlertTriangle, Wallet, Target, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useApprovedPlans } from "@/hooks/useApprovedPlans";
import { useStudentAccess } from "@/hooks/useStudentAccess";
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
    glow: "shadow-[0_0_20px_rgba(52,211,153,0.1)]",
  },
  tight: {
    label: "TIGHT",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    ring: "ring-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.1)]",
  },
  pass: {
    label: "PASS",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    ring: "ring-red-500/30",
    glow: "",
  },
};

export default function AcademyVaultApproval() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { hasAccess, status: accessStatus, loading: accessLoading } = useStudentAccess();
  const { activePlan, savePlan, replaceWithNew } = useApprovedPlans();

  // Inputs
  const [direction, setDirection] = useState<"calls" | "puts">("calls");
  const [contractPrice, setContractPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const accountBalance = profile?.account_balance ?? 0;
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

  const handleUsePlan = async () => {
    if (!selectedChoice || !result) return;

    const planData = {
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
    if (!selectedChoice || !result) return;

    const planData = {
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
      <PageHeader
        title="VAULT Approval"
        subtitle="Every trade gets checked before you enter."
        action={
          activePlan ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs gap-1">
              <Check className="h-3 w-3" /> Active plan
            </Badge>
          ) : undefined
        }
      />

      <div className="px-4 md:px-6 pb-10 space-y-5 max-w-5xl">
        {/* ═══ RULES STRIP ═══ */}
        <div className="flex flex-wrap gap-3">
          <RulesChip icon={Wallet} label="Account" value={`$${accountBalance.toLocaleString()}`} />
          <RulesChip icon={Shield} label="Trade loss limit" value={formatCurrency(tradeLossLimit)} />
          <RulesChip
            icon={Target}
            label="Account level"
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
          <div className="vault-glass-card p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Set your account balance first</p>
              <p className="text-xs text-muted-foreground mt-0.5">Go to My Trades and set your starting balance before checking trades.</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs border-amber-500/30 text-amber-400" onClick={() => navigate("/academy/trade")}>
              Set Balance
            </Button>
          </div>
        )}

        {/* ═══ TWO-COLUMN LAYOUT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT: Trade Check Card */}
          <div className="lg:col-span-3 space-y-5">
            <div className="vault-glass-card p-5 space-y-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Trade Check
              </h3>

              {/* Direction toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Direction</Label>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  {(["calls", "puts"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDirection(d)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-100",
                        direction === d
                          ? d === "calls"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/15 text-red-400 border-red-500/20"
                          : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      {d === "calls" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {d === "calls" ? "Up (Calls)" : "Down (Puts)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contract price */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Current contract price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={contractPrice}
                    onChange={(e) => { setContractPrice(e.target.value); setSelectedIndex(null); }}
                    className="pl-7 text-lg font-semibold tabular-nums h-12"
                  />
                </div>
              </div>

              {/* Ticker */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ticker (optional)</Label>
                <Input
                  placeholder="SPY, TSLA, NVDA…"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>
            </div>

            {/* ═══ CONTRACT CHOICE CARDS ═══ */}
            {result && (
              <div className="space-y-3">
                {result.allPass && (
                  <div className="vault-glass-card p-4 border-red-500/20 bg-red-500/5 flex items-center gap-3">
                    <X className="h-4 w-4 text-red-400 shrink-0" />
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
                          "relative vault-glass-card p-4 text-left space-y-2.5 transition-all duration-100 active:scale-[0.98]",
                          isSelected && `ring-2 ${sc.ring} ${sc.glow}`,
                          choice.isRecommended && !isSelected && "ring-1 ring-primary/30",
                          choice.status === "pass" && "opacity-50"
                        )}
                      >
                        {choice.isRecommended && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            <Star className="h-2.5 w-2.5" /> Best
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-foreground tabular-nums">{choice.contracts}</span>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", sc.bg, sc.border, sc.color)}>
                            {sc.label}
                          </span>
                        </div>

                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {choice.contracts === 1 ? "contract" : "contracts"}
                        </p>

                        <div className="space-y-1.5 pt-1 border-t border-border/30">
                          <MetricLine label="Cash needed" value={formatCurrency(choice.cashNeeded)} />
                          <MetricLine
                            label="Exit if wrong"
                            value={choice.fullPremiumRiskOk ? "Full risk OK" : choice.suggestedExit ? formatCurrency(choice.suggestedExit) : "—"}
                            valueCls={choice.fullPremiumRiskOk ? "text-emerald-400" : undefined}
                          />
                          <MetricLine label="Worst-case loss" value={formatCurrency(choice.worstCaseLoss)} valueCls="text-red-400" />
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
            <div className="vault-glass-card p-6 space-y-5 sticky top-4">
              {selectedChoice ? (
                <HeroDecisionCard
                  choice={selectedChoice}
                  ticker={ticker}
                  direction={direction}
                  saving={saving}
                  onUsePlan={handleUsePlan}
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <Shield className="h-10 w-10 text-muted-foreground/20 mx-auto" />
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
    <>
      {/* Status hero */}
      <div className={cn("text-center py-4 rounded-xl", sc.bg, "border", sc.border)}>
        <p className={cn("text-3xl font-bold tracking-tight", sc.color)}>{sc.label}</p>
        {ticker && <p className="text-xs text-muted-foreground mt-1">{ticker.toUpperCase()} · {direction === "calls" ? "Calls" : "Puts"}</p>}
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
        <HeroLine label="Worst-case loss" value={formatCurrency(choice.worstCaseLoss)} valueCls="text-red-400" />

        <div className="pt-2 border-t border-border/30 space-y-3">
          <HeroLine label="Take profit 1" value={formatCurrency(choice.tp1)} valueCls="text-emerald-400" />
          <HeroLine label="Take profit 2" value={formatCurrency(choice.tp2)} valueCls="text-emerald-400" />
        </div>
      </div>

      {/* Coaching note */}
      <div className="flex items-start gap-2 rounded-xl bg-muted/20 border border-border/30 p-3">
        <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">{choice.coachingNote}</p>
      </div>

      {/* CTA */}
      <Button
        className="w-full h-12 text-base font-semibold gap-2"
        disabled={choice.status === "pass" || saving}
        onClick={onUsePlan}
      >
        {saving ? "Saving…" : (
          <>
            <Check className="h-4 w-4" /> Use This Plan
            <ChevronRight className="h-4 w-4 ml-auto" />
          </>
        )}
      </Button>

      {choice.status === "pass" && (
        <p className="text-[10px] text-center text-muted-foreground">
          This setup doesn't fit your account rules. Try a lower contract price.
        </p>
      )}
    </>
  );
}

/* ── Shared sub-components ── */
function RulesChip({ icon: Icon, label, value, valueCls }: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueCls?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card border border-border/50 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums text-foreground", valueCls)}>{value}</span>
    </div>
  );
}

function MetricLine({ label, value, valueCls }: { label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums text-foreground", valueCls)}>{value}</span>
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
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm tabular-nums text-foreground", bold && "font-bold", valueCls)}>{value}</span>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[180px]">{sub}</p>}
      </div>
    </div>
  );
}
