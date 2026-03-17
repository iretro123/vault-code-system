import React, { forwardRef } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { detectTier, TIER_DEFAULTS } from "@/lib/tradePlannerCalc";

interface TodaysLimitsSectionProps {
  balanceOverride?: number;
  riskPercentOverride?: number | null;
}

function deriveLastRestriction(vault: ReturnType<typeof useVaultState>["state"]): string {
  if (vault.last_block_reason) return vault.last_block_reason;
  if (vault.risk_remaining_today <= 0) return "Daily loss limit reached";
  if (vault.trades_remaining_today <= 0) return "Trade limit reached";
  if (vault.max_contracts_allowed <= 0) return "Max contracts exceeded";
  return "No restrictions today";
}

export const TodaysLimitsSection = forwardRef<HTMLDivElement, TodaysLimitsSectionProps>(function TodaysLimitsSection({ balanceOverride, riskPercentOverride }, ref) {
  const { state: vaultState, loading } = useVaultState();

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted/30 rounded w-1/2" />
        <div className="h-4 bg-muted/30 rounded w-2/3" />
      </div>
    );
  }

  const bal = balanceOverride ?? vaultState.account_balance;
  const tier = detectTier(bal);
  const defaults = TIER_DEFAULTS[tier];
  const riskBudget = bal * (defaults.riskPercent / 100);

  const lastRestriction = deriveLastRestriction(vaultState);
  const hasRestriction = lastRestriction !== "No restrictions today";

  return (
    <div ref={ref} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider mb-1">Risk Budget</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            ${riskBudget.toFixed(0)}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider mb-1">Trades / Session</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {vaultState.trades_remaining_today} / {vaultState.max_trades_per_day}
          </p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <p className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider mb-1">Max Contracts</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {vaultState.max_contracts_allowed}
          </p>
        </div>
      </div>

      {/* Last Restriction */}
      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">Last Restriction</p>
        <p className={`text-xs font-medium ${hasRestriction ? "text-amber-400" : "text-muted-foreground/60"}`}>
          {lastRestriction}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
        Based on your balance and tier.
      </p>
    </div>
  );
});
