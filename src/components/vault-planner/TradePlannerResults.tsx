import { PlannerInputs, PlannerResult, formatCurrency, buildCopyText } from "@/lib/tradePlannerCalc";
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPStatusBadge } from "./XPStatusBadge";
import { xp } from "./xp-styles";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  inputs: PlannerInputs;
  result: PlannerResult;
  onBack: () => void;
}

function HeroCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex-1 min-w-[120px] rounded-[4px] p-3 text-center"
      style={{ background: xp.heroBg, border: xp.heroBorder }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-primary/80 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold font-mono text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-2">
      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function WhatToDoSummary({ inputs, result }: { inputs: PlannerInputs; result: PlannerResult }) {
  return (
    <div
      className="rounded-[4px] p-3 space-y-1 text-[12px] text-foreground"
      style={{ background: xp.heroBg, border: xp.heroBorder }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 mb-1.5">What To Do</p>
      {inputs.ticker && <p>• Ticker: <strong>{inputs.ticker.toUpperCase()}</strong></p>}
      <p>• Buy <strong>{result.finalContracts}</strong> {inputs.direction} at <strong>{formatCurrency(inputs.entryPremium)}</strong></p>
      <p>• Cut the trade if the option hits <strong>{formatCurrency(inputs.stopPremium)}</strong></p>
      <p>• Money needed to enter: <strong>{formatCurrency(result.totalPositionCost)}</strong></p>
      <p>• Planned loss if stop hits: <strong>{formatCurrency(result.totalPlannedRisk)}</strong></p>
      <p>• Max you can lose on this trade: <strong>{formatCurrency(result.maxPossibleLoss)}</strong> (the premium you paid)</p>
      <p>• Main target (1:2): <strong>{formatCurrency(result.rr1to2Target)}</strong> → you make <strong>+{formatCurrency(result.profitAtRR2)}</strong></p>
      <p>• Optional take profits: <strong>{formatCurrency(result.tp1Premium)}</strong> (+{formatCurrency(result.profitAtTP1)}) and <strong>{formatCurrency(result.tp2Premium)}</strong> (+{formatCurrency(result.profitAtTP2)})</p>
      {result.breakEvenAtExpiry != null && (
        <p>• Stock must reach <strong>{formatCurrency(result.breakEvenAtExpiry)}</strong> at expiry to break even</p>
      )}
    </div>
  );
}

export function TradePlannerResults({ inputs, result, onBack }: Props) {
  const canTrade = result.finalContracts > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(buildCopyText(inputs, result));
    toast.success("Trade plan copied to clipboard");
  };

  const handleSave = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("vault_saved_plans") || "[]");
      saved.unshift({ inputs, result, savedAt: new Date().toISOString() });
      localStorage.setItem("vault_saved_plans", JSON.stringify(saved.slice(0, 20)));
      toast.success("Plan saved locally");
    } catch {
      toast.error("Failed to save plan");
    }
  };

  if (!canTrade) {
    return (
      <XPWindow title="Vault Trade Plan - Results" onClose={onBack}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <XPStatusBadge label="Risk Check" pass={false} />
            <XPStatusBadge label="Debit Check" pass={false} />
          </div>
          <div
            className="rounded-[4px] p-4 space-y-2"
            style={{ background: xp.warningBg, border: xp.warningBorder }}
          >
            <p className="text-sm font-bold" style={{ color: xp.warningText }}>Why you can't take this trade yet</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Try a cheaper option</li>
              <li>Pick a setup with a tighter stop (only if chart setup still makes sense)</li>
              <li>Wait for a better entry</li>
              <li>Lower the option price you choose</li>
            </ul>
          </div>
          <div className="flex justify-end">
            <XPButton onClick={onBack}>Back</XPButton>
          </div>
        </div>
      </XPWindow>
    );
  }

  return (
    <XPWindow title="Vault Trade Plan - Results" onClose={onBack}>
      <div className="space-y-4">
        {/* Header + badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-foreground">
              Your Trade Plan{inputs.ticker ? ` — ${inputs.ticker.toUpperCase()}` : ""} (Easy Results)
            </p>
          </div>
          <div className="flex gap-1.5">
            <XPStatusBadge label="Risk Check" pass={result.riskCheckPass} />
            <XPStatusBadge label="Debit Check" pass={result.debitCheckPass} />
          </div>
        </div>

        {/* Theta warning */}
        {result.thetaWarning && (
          <div
            className="rounded-[4px] px-3 py-2 text-[11px] font-medium flex items-center gap-1.5"
            style={{ background: xp.warningBg, border: xp.warningBorder, color: xp.warningText }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {result.thetaWarning}
          </div>
        )}

        {/* Hero cards — outcome-first order */}
        <div className="flex flex-wrap gap-2">
          <HeroCard label="HOW MANY CONTRACTS?" value={`${result.finalContracts}`} sub="contracts" />
          <HeroCard label="OPTION STOP PRICE" value={formatCurrency(inputs.stopPremium)} sub="Cut the trade here" />
          <HeroCard label="PLANNED LOSS IF STOP HITS" value={formatCurrency(result.totalPlannedRisk)} sub="Your planned max loss" />
          <HeroCard label="MAX POSSIBLE LOSS" value={formatCurrency(result.maxPossibleLoss)} sub="Total premium at risk" />
        </div>

        {/* What To Do summary */}
        <WhatToDoSummary inputs={inputs} result={result} />

        {/* Primary metrics — targets with dollar profit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="Money Needed to Enter" value={formatCurrency(result.totalPositionCost)} />
          <MetricCell label="Main Target (1:2)" value={formatCurrency(result.rr1to2Target)} />
          <MetricCell label="Profit if 1:2 Hits" value={`+${formatCurrency(result.profitAtRR2)}`} highlight />
          <MetricCell label="Profit if 1:3 Hits" value={`+${formatCurrency(result.profitAtRR3)}`} highlight />
        </div>

        {/* TP targets with dollar profit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="Quick Profit (TP1 +30%)" value={formatCurrency(result.tp1Premium)} />
          <MetricCell label="TP1 Dollar Profit" value={`+${formatCurrency(result.profitAtTP1)}`} highlight />
          <MetricCell label="Bigger Profit (TP2 +50%)" value={formatCurrency(result.tp2Premium)} />
          <MetricCell label="TP2 Dollar Profit" value={`+${formatCurrency(result.profitAtTP2)}`} highlight />
        </div>

        {/* Account context + secondary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="Money I Can Lose" value={formatCurrency(result.riskBudget)} />
          <MetricCell label="Cost Per Contract" value={formatCurrency(result.costPerContract)} />
          <MetricCell label="Account Risk %" value={`${result.accountRiskPercent.toFixed(1)}%`} />
          <MetricCell label="Account Exposure %" value={`${result.accountExposurePercent.toFixed(1)}%`} />
        </div>

        {/* Break-even + delta exposure */}
        {(result.breakEvenAtExpiry != null || result.deltaExposure != null) && (
          <div className="grid grid-cols-2 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
            {result.breakEvenAtExpiry != null && (
              <MetricCell label="Break-Even at Expiry" value={formatCurrency(result.breakEvenAtExpiry)} />
            )}
            {result.deltaExposure != null && (
              <MetricCell label="Delta Exposure ($ per $1 move)" value={formatCurrency(result.deltaExposure)} />
            )}
          </div>
        )}

        {/* Warning */}
        <div
          className="rounded-[4px] p-3 space-y-1 text-[11px] text-muted-foreground"
          style={{ background: xp.warningBg, border: xp.warningBorder }}
        >
          <p>⚠ Slippage/gaps can lose more than planned loss. Cut at your stop — planned loss is not a guarantee.</p>
          <p>For long options, max you can lose is the total premium paid ({formatCurrency(result.maxPossibleLoss)}).</p>
          <p>This planner gives structure: size, stop, and target before you enter the trade.</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <XPButton onClick={onBack}>Back</XPButton>
          <XPButton onClick={handleCopy}>Copy Plan</XPButton>
          <XPButton variant="primary" onClick={handleSave}>Save Plan</XPButton>
        </div>
      </div>
    </XPWindow>
  );
}
