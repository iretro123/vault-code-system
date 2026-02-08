import React from "react";
import { useVaultState } from "@/contexts/VaultStateContext";

function deriveLastRestriction(vault: ReturnType<typeof useVaultState>["state"]): string {
  // Use persisted block reason if available
  if (vault.last_block_reason) return vault.last_block_reason;
  if (vault.risk_remaining_today <= 0) return "Daily loss limit reached";
  if (vault.trades_remaining_today <= 0) return "Trade limit reached";
  if (vault.max_contracts_allowed <= 0) return "Max contracts exceeded";
  return "No restrictions today";
}

export function TodaysLimitsSection() {
  const { state: vaultState, loading } = useVaultState();

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted/30 rounded w-1/2" />
        <div className="h-4 bg-muted/30 rounded w-2/3" />
      </div>
    );
  }

  const lastRestriction = deriveLastRestriction(vaultState);
  const hasRestriction = lastRestriction !== "No restrictions today";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Risk Left</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            ${vaultState.risk_remaining_today.toFixed(0)}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Trades Left</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {vaultState.trades_remaining_today} / {vaultState.max_trades_per_day}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Max Contracts</p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {vaultState.max_contracts_allowed}
          </p>
        </div>
      </div>

      {/* Last Restriction */}
      <div className="p-3 rounded-lg bg-muted/10 border border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last Restriction</p>
        <p className={`text-xs font-medium ${hasRestriction ? "text-amber-400" : "text-muted-foreground"}`}>
          {lastRestriction}
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        Limits are set by Vault State.
      </p>
    </div>
  );
}
