import { PlannerInputs, PlannerResult, PremiumFit, formatCurrency, buildCopyText } from "@/lib/tradePlannerCalc";
import { XPWindow } from "./XPWindow";
import { XPButton } from "./XPButton";
import { XPStatusBadge } from "./XPStatusBadge";
import { xp } from "./xp-styles";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  inputs: PlannerInputs;
  result: PlannerResult;
  onBack: () => void;
}

function HeroCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-[110px] rounded-[4px] p-2.5 text-center" style={{ background: xp.heroBg, border: xp.heroBorder }}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-primary/80 mb-0.5">{label}</p>
      <p className="text-lg md:text-xl font-bold font-mono text-foreground">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
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

function VerdictBar({ verdict, reason }: { verdict: string; reason: string }) {
  const config = {
    SAFE: { bg: "hsl(160 84% 39% / 0.10)", border: "hsl(160 84% 39% / 0.3)", color: "hsl(160 84% 39%)", label: "SAFE", Icon: CheckCircle2 },
    AGGRESSIVE: { bg: "hsl(38 92% 50% / 0.10)", border: "hsl(38 92% 50% / 0.3)", color: "hsl(38 92% 50%)", label: "AGGRESSIVE", Icon: AlertTriangle },
    NO_TRADE: { bg: "hsl(0 72% 51% / 0.10)", border: "hsl(0 72% 51% / 0.3)", color: "hsl(0 72% 51%)", label: "NO TRADE", Icon: XCircle },
  }[verdict] ?? { bg: "transparent", border: "transparent", color: "inherit", label: verdict, Icon: XCircle };

  return (
    <div className="rounded-[4px] px-3 py-2.5 text-center" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <div className="flex items-center justify-center gap-1.5">
        <config.Icon className="w-4 h-4" style={{ color: config.color }} />
        <p className="text-base font-black tracking-wide" style={{ color: config.color }}>{config.label}</p>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{reason}</p>
    </div>
  );
}

function PremiumFitBadge({ fit }: { fit: PremiumFit }) {
  const config = {
    IDEAL: { bg: "hsl(160 84% 39% / 0.10)", border: "hsl(160 84% 39% / 0.25)", color: "hsl(160 84% 39%)", label: "IDEAL" },
    AGGRESSIVE: { bg: "hsl(38 92% 50% / 0.10)", border: "hsl(38 92% 50% / 0.25)", color: "hsl(38 92% 50%)", label: "AGGRESSIVE" },
    TOO_EXPENSIVE: { bg: "hsl(0 72% 51% / 0.10)", border: "hsl(0 72% 51% / 0.25)", color: "hsl(0 72% 51%)", label: "TOO EXPENSIVE" },
  }[fit];
  return (
    <div className="rounded-[4px] px-2.5 py-1 text-center" style={{ background: config.bg, border: `1px solid ${config.border}` }}>
      <span className="text-[10px] text-muted-foreground">Premium Fit: </span>
      <span className="text-[10px] font-bold" style={{ color: config.color }}>{config.label}</span>
    </div>
  );
}

function safeCurrency(n: number | undefined | null): string {
  if (n == null || !isFinite(n) || isNaN(n)) return "—";
  return formatCurrency(n);
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
          <VerdictBar verdict={result.verdict} reason={result.verdictReason} />
          <div className="rounded-[4px] p-3 space-y-2" style={{ background: xp.warningBg, border: xp.warningBorder }}>
            <p className="text-sm font-bold" style={{ color: xp.warningText }}>Why you can't take this trade yet</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Try a cheaper option</li>
              <li>Pick a setup with a tighter stop</li>
              <li>Wait for a better entry</li>
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
      <div className="space-y-3">
        {/* Verdict */}
        <VerdictBar verdict={result.verdict} reason={result.verdictReason} />

        {/* Theta warning */}
        {result.thetaWarning && (
          <div className="rounded-[4px] px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5"
            style={{ background: xp.warningBg, border: xp.warningBorder, color: xp.warningText }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {result.thetaWarning}
          </div>
        )}

        {/* Hero cards */}
        <div className="flex flex-wrap gap-2">
          {result.safeContracts !== result.maxContracts && result.maxContracts > 0 ? (
            <>
              <HeroCard label="SAFE CONTRACTS" value={`${result.safeContracts}`} />
              <HeroCard label="MAX CONTRACTS" value={`${result.maxContracts}`} />
            </>
          ) : (
            <HeroCard label="CONTRACTS" value={`${result.finalContracts}`} />
          )}
          <HeroCard label="PLANNED LOSS" value={safeCurrency(result.totalPlannedRisk)} />
          <HeroCard label="ENTRY COST" value={safeCurrency(result.totalPositionCost)} />
        </div>

        {/* Targets */}
        <div className="grid grid-cols-3 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="TP1 (1:1)" value={safeCurrency(result.tp1Premium)} />
          <MetricCell label="Main Target (1:2)" value={safeCurrency(result.mainTarget)} highlight />
          <MetricCell label="TP2 (1:3)" value={safeCurrency(result.tp2Premium)} />
        </div>

        {/* Profit at targets */}
        <div className="grid grid-cols-3 gap-px rounded-[4px] overflow-hidden" style={{ border: xp.fieldsetBorder }}>
          <MetricCell label="Profit at TP1" value={`+${safeCurrency(result.profitAtTP1)}`} highlight />
          <MetricCell label="Profit at 1:2" value={`+${safeCurrency(result.profitAtMain)}`} highlight />
          <MetricCell label="Profit at TP2" value={`+${safeCurrency(result.profitAtTP2)}`} highlight />
        </div>

        {/* Why this result */}
        <p className="text-[11px] text-muted-foreground/70 px-1">{result.sizingExplanation}</p>

        {/* Warning */}
        <div className="rounded-[4px] p-2.5 text-[10px] text-muted-foreground space-y-0.5"
          style={{ background: xp.warningBg, border: xp.warningBorder }}>
          <p>⚠ Cut at your stop — planned loss is not a guarantee.</p>
          <p>Max loss for long options = premium paid ({safeCurrency(result.maxPossibleLoss)}).</p>
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
