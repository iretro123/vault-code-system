import { PlannerInputs, PlannerResult, formatCurrency, buildCopyText } from "@/lib/tradePlannerCalc";
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPStatusBadge } from "./XPStatusBadge";
import { xp } from "./xp-styles";
import { toast } from "sonner";

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

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2">
      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono text-foreground">{value}</p>
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
              <li>Move your stop closer (only if chart idea still makes sense)</li>
              <li>Lower the option price you choose</li>
              <li>Wait for a better setup</li>
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
          <p className="text-sm font-bold text-foreground">Your Trade Plan (Easy Results)</p>
          <div className="flex gap-1.5">
            <XPStatusBadge label="Risk Check" pass={result.riskCheckPass} />
            <XPStatusBadge label="Debit Check" pass={result.debitCheckPass} />
          </div>
        </div>

        {/* Hero cards */}
        <div className="flex flex-wrap gap-2">
          <HeroCard label="HOW MANY CONTRACTS?" value={`${result.finalContracts}`} sub="contract" />
          <HeroCard label="CUT LOSS AT (Option)" value={formatCurrency(inputs.stopPremium)} sub="Get out here if stop hits" />
          <HeroCard label="PLANNED LOSS IF STOP HITS" value={formatCurrency(result.totalPlannedRisk)} sub="Your planned max loss" />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="Money You Can Lose" value={formatCurrency(result.riskBudget)} />
          <MetricCell label="Money Needed to Enter" value={formatCurrency(result.totalPositionCost)} />
          <MetricCell label="Cost Per Contract" value={formatCurrency(result.costPerContract)} />
          <MetricCell label="Planned Loss / Contract" value={formatCurrency(result.plannedRiskPerContract)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="1:2 Target" value={formatCurrency(result.rr1to2Target)} />
          <MetricCell label="TP1 (+30%)" value={formatCurrency(result.tp1Premium)} />
          <MetricCell label="1:3 Target" value={formatCurrency(result.rr1to3Target)} />
          <MetricCell label="TP2 (+50%)" value={formatCurrency(result.tp2Premium)} />
        </div>

        {/* Delta exposure */}
        {result.deltaExposure != null && (
          <div className="grid grid-cols-1 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
            <MetricCell label="Delta Exposure ($ per $1 stock move)" value={formatCurrency(result.deltaExposure)} />
          </div>
        )}

        {/* Warning */}
        <div
          className="rounded-[4px] p-3 space-y-1 text-[11px] text-muted-foreground"
          style={{ background: xp.warningBg, border: xp.warningBorder }}
        >
          <p>⚠ Slippage/gaps can lose more than planned loss. Cut at your stop — planned loss is not a guarantee.</p>
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
