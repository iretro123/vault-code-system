import React from "react";
import { useVaultState } from "@/contexts/VaultStateContext";

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

      <p className="text-xs text-muted-foreground text-center pt-1">
        Limits are set by Vault State.
      </p>
    </div>
  );
}
