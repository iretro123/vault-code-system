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
    if (status.light === "GREEN") return <Shield className="h-5 w-5 text-emerald-400" />;
    if (status.light === "YELLOW") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    if (status.light === "RED") return <Lock className="h-5 w-5 text-rose-400" />;
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
          status.light === "GREEN" && "bg-emerald-500/10 text-emerald-400",
          status.light === "YELLOW" && "bg-amber-500/10 text-amber-400",
          status.light === "RED" && "bg-rose-500/10 text-rose-400",
          status.light === "UNKNOWN" && "bg-white/5 text-muted-foreground"
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
            "w-full h-12 font-semibold",
            canProceed ? "vault-cta" : "bg-white/5 text-muted-foreground"
          )}
        >
          {loading ? "Checking…" : canProceed ? "Proceed (Vault Verified)" : "Blocked"}
        </Button>
      </div>

      {/* Block reason */}
      {!loading && data && !data.execution_allowed && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-medium text-rose-400">Why Blocked</span>
          </div>
          <p className="text-sm text-foreground">{data.block_reason}</p>
          <p className="text-xs text-muted-foreground">
            Fix the blocker: Ritual / Recovery / Cooldown / Intervention.
          </p>
        </div>
      )}

      {/* Cooldown warning */}
      {!loading && data?.cooldown_active && (
        <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center gap-2">
          <Timer className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-amber-400">
            Cooldown active — wait {data.cooldown_remaining_minutes ?? "…"} min.
          </span>
        </div>
      )}
    </Card>
  );
}
