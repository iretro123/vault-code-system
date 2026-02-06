import React from "react";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { useDailyVaultStatus } from "@/hooks/useDailyVaultStatus";

export function TodaysLimitsSection() {
  const { data: execData, loading: execLoading } = useVaultExecutionPermission();
  const vaultStatus = useDailyVaultStatus();

  const loading = execLoading || vaultStatus.loading;

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-muted/30 rounded w-1/2" />
        <div className="h-4 bg-muted/30 rounded w-2/3" />
        <div className="h-4 bg-muted/30 rounded w-1/2" />
      </div>
    );
  }

  const riskLimit = execData?.effective_risk_limit ?? 0;
  const maxTrades = vaultStatus.maxTrades ?? 0;
  const tradesTaken = vaultStatus.tradesToday ?? 0;
  const tradesRemaining = Math.max(0, maxTrades - tradesTaken);
  const protectionLevel = execData?.protection_level ?? "Standard";
  const consistencyLevel = execData?.consistency_level ?? "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Risk Limit */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Risk Limit</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            {riskLimit.toFixed(2)}%
          </p>
        </div>

        {/* Trades Remaining */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Trades Left</p>
          <p className="text-lg font-mono font-semibold text-foreground">
            {tradesRemaining} / {maxTrades}
          </p>
        </div>

        {/* Protection Level */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Protection</p>
          <p className="text-sm font-medium text-foreground">{protectionLevel}</p>
        </div>

        {/* Consistency */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Consistency</p>
          <p className="text-sm font-medium text-foreground">{consistencyLevel}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-1">
        Limits adjust based on your Vault score and recent performance.
      </p>
    </div>
  );
}
