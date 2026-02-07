import React from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreTradeExecutionGateV2Props {
  onAllowed: (riskLimit: number | null) => void;
}

export function PreTradeExecutionGateV2({ onAllowed }: PreTradeExecutionGateV2Props) {
  const { state: vaultState, loading } = useVaultState();

  const canProceed =
    vaultState.vault_status !== "RED" &&
    !vaultState.open_trade &&
    vaultState.trades_remaining_today > 0 &&
    vaultState.risk_remaining_today > 0;

  const statusLight = canProceed ? "GREEN" : "RED";
  const statusLabel = loading ? "Checking…" : canProceed ? "Cleared" : "Not Cleared";

  const statusIcon = canProceed
    ? <CheckCircle className="h-5 w-5 text-emerald-400" />
    : <Lock className="h-5 w-5 text-muted-foreground" />;

  return (
    <Card className="vault-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {statusIcon}
          <h3 className="font-semibold text-foreground">Execution Gate</h3>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          statusLight === "GREEN" && "bg-emerald-500/10 text-emerald-400",
          statusLight === "RED" && "bg-white/5 text-muted-foreground",
        )}>
          {statusLabel}
        </div>
      </div>

      {/* Proceed Button */}
      <div className="mb-4">
        <Button
          onClick={() => onAllowed(vaultState.risk_remaining_today)}
          disabled={!canProceed || loading}
          className={cn(
            "w-full h-12 font-semibold",
            canProceed ? "vault-cta" : "bg-white/5 text-muted-foreground"
          )}
        >
          {loading ? "Checking…" : canProceed ? "Proceed" : "Not Ready"}
        </Button>
      </div>

      {/* Guidance for blocked state */}
      {!loading && !canProceed && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Not Cleared</span>
          </div>
          <p className="text-sm text-muted-foreground">Vault is protecting discipline.</p>
        </div>
      )}
    </Card>
  );
}
