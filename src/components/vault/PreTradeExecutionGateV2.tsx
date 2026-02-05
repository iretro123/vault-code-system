import React, { useMemo } from "react";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, AlertTriangle, Timer, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreTradeExecutionGateV2Props {
  onAllowed: (riskLimit: number | null) => void;
}

export function PreTradeExecutionGateV2({ onAllowed }: PreTradeExecutionGateV2Props) {
  const { data, loading, status } = useVaultExecutionPermission();

  const canProceed = useMemo(() => {
    return !!data?.execution_allowed && !data?.cooldown_active;
  }, [data]);

  const statusIcon = useMemo(() => {
    if (status.light === "GREEN") return <Shield className="h-5 w-5 text-status-active" />;
    if (status.light === "YELLOW") return <AlertTriangle className="h-5 w-5 text-status-warning" />;
    if (status.light === "RED") return <Lock className="h-5 w-5 text-destructive" />;
    return <Shield className="h-5 w-5 text-muted-foreground" />;
  }, [status.light]);

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
          status.light === "GREEN" && "bg-status-active/10 text-status-active",
          status.light === "YELLOW" && "bg-status-warning/10 text-status-warning",
          status.light === "RED" && "bg-destructive/10 text-destructive",
          status.light === "UNKNOWN" && "bg-muted text-muted-foreground"
        )}>
          {loading ? "Checking…" : status.label}
        </div>
      </div>

      {/* Proceed Button */}
      <div className="mb-4">
        <Button
          onClick={() => onAllowed(data?.effective_risk_limit ?? null)}
          disabled={!canProceed || loading}
          className={cn(
            "w-full",
            canProceed && "vault-cta"
          )}
          variant={canProceed ? "outline" : "secondary"}
        >
          {loading ? "Checking…" : canProceed ? "Proceed (Vault Verified)" : "Blocked"}
        </Button>
      </div>

      {/* Block reason */}
      {!loading && data && !data.execution_allowed && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Why Blocked</span>
          </div>
          <p className="text-sm text-foreground">{data.block_reason}</p>
          <p className="text-xs text-muted-foreground">
            Fix the blocker: Ritual / Recovery / Cooldown / Intervention.
          </p>
        </div>
      )}

      {/* Cooldown warning */}
      {!loading && data?.cooldown_active && (
        <div className="mt-4 p-3 rounded-xl border border-status-warning/30 bg-status-warning/5 flex items-center gap-2">
          <Timer className="h-4 w-4 text-status-warning" />
          <span className="text-sm text-status-warning">
            Cooldown active — wait {data.cooldown_remaining_minutes ?? "…"} min.
          </span>
        </div>
      )}
    </Card>
  );
}
