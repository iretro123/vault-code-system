import { useState } from "react";
import { cn } from "@/lib/utils";
import { Target, ArrowRight, Copy, Check } from "lucide-react";
import { formatCurrency } from "@/lib/vaultApprovalCalc";

interface RiskRewardVisualizerProps {
  riskPerContract: number;
  contractPrice: number;
  contracts: number;
  tp1: number;
  tp2: number;
  tp3: number;
  exitPrice: number | null;
  ticker: string;
  direction: string;
  fullPremiumRiskOk: boolean;
}

const RATIOS = [
  { label: "1:1", multiplier: 1 },
  { label: "1:2", multiplier: 2 },
  { label: "1:3", multiplier: 3 },
] as const;

export function RiskRewardVisualizer({
  riskPerContract, contractPrice, contracts, tp1, tp2, tp3, exitPrice, ticker, direction, fullPremiumRiskOk,
}: RiskRewardVisualizerProps) {
  const [selectedRatio, setSelectedRatio] = useState(1); // index into RATIOS
  const [copied, setCopied] = useState(false);

  const totalRisk = riskPerContract * 100 * contracts;
  const targets = [tp1, tp2, tp3];
  const selectedTarget = targets[selectedRatio];
  const selectedProfit = totalRisk * RATIOS[selectedRatio].multiplier;

  const maxBar = Math.max(totalRisk, selectedProfit);

  const exitDisplay = fullPremiumRiskOk ? "Full premium" : exitPrice ? `$${exitPrice.toFixed(2)}` : "—";
  const dirLabel = direction === "calls" ? "Call" : "Put";
  const tickerDisplay = ticker || "___";

  const brokerSteps = [
    `Buy ${contracts} ${tickerDisplay} ${dirLabel}${contracts > 1 ? "s" : ""} at $${contractPrice.toFixed(2)}`,
    `Set stop-loss exit at ${exitDisplay}`,
    `Set profit target at $${selectedTarget.toFixed(2)}`,
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(brokerSteps.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      {/* R:R Ratio Selector */}
      <div>
        <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">Risk : Reward</p>
        <div className="grid grid-cols-3 gap-1.5">
          {RATIOS.map((ratio, idx) => {
            const isSelected = selectedRatio === idx;
            const profit = totalRisk * ratio.multiplier;
            return (
              <button
                key={ratio.label}
                onClick={() => setSelectedRatio(idx)}
                className={cn(
                  "relative rounded-lg p-2.5 transition-all duration-100 active:scale-[0.97] text-left overflow-hidden",
                  isSelected
                    ? "bg-white/[0.08] ring-1 ring-primary/40 shadow-[0_0_12px_rgba(59,130,246,0.12)]"
                    : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]"
                )}
              >
                {/* Visual bars */}
                <div className="flex items-end gap-[3px] h-10 mb-2">
                  {/* Risk bar (red) */}
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className="rounded-t-sm bg-red-500/60 transition-all duration-200"
                      style={{ height: `${(totalRisk / (totalRisk * 3)) * 100}%`, minHeight: 6 }}
                    />
                  </div>
                  {/* Reward bar (green) */}
                  <div className="flex-1 flex flex-col justify-end h-full">
                    <div
                      className="rounded-t-sm bg-emerald-500/60 transition-all duration-200"
                      style={{ height: `${(profit / (totalRisk * 3)) * 100}%`, minHeight: 6 }}
                    />
                  </div>
                </div>

                {/* Label */}
                <p className={cn(
                  "text-sm font-bold text-center",
                  isSelected ? "text-foreground" : "text-muted-foreground/70"
                )}>
                  {ratio.label}
                </p>

                {/* Dollar values */}
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-red-400/80 font-semibold tabular-nums">-${totalRisk.toFixed(0)}</span>
                  <span className="text-[9px] text-emerald-400/80 font-semibold tabular-nums">+${profit.toFixed(0)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected R:R Summary */}
      <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2">
        <div className="flex-1 text-center">
          <p className="text-[8px] text-red-400/60 font-semibold uppercase">Risk</p>
          <p className="text-sm font-bold tabular-nums text-red-400">-${totalRisk.toFixed(0)}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        <div className="flex-1 text-center">
          <p className="text-[8px] text-emerald-400/60 font-semibold uppercase">Reward ({RATIOS[selectedRatio].label})</p>
          <p className="text-sm font-bold tabular-nums text-emerald-400">+${selectedProfit.toFixed(0)}</p>
        </div>
        <div className="w-px h-6 bg-white/[0.06]" />
        <div className="text-center shrink-0 px-1">
          <p className="text-[8px] text-muted-foreground/40 font-semibold uppercase">Target</p>
          <p className="text-xs font-bold tabular-nums text-foreground">${selectedTarget.toFixed(2)}</p>
        </div>
      </div>

      {/* Brokerage Guide */}
      <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-primary shrink-0" />
            <p className="text-[10px] font-semibold text-foreground">What to do on your broker</p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[9px] text-primary/70 hover:text-primary transition-colors"
          >
            {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="space-y-1">
          {brokerSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-[8px] font-bold text-primary shrink-0 mt-px">
                {i + 1}
              </span>
              <p className="text-[11px] text-foreground/80 font-medium leading-snug">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
