import React, { useMemo } from "react";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Lock, Activity, Timer } from "lucide-react";

function remainingLabel(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return "None";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function VaultHUD() {
  const { data, loading, error, status } = useVaultExecutionPermission();

  const lightClass = useMemo(() => {
    if (status.light === "GREEN") return "bg-status-active";
    if (status.light === "YELLOW") return "bg-status-warning";
    if (status.light === "RED") return "bg-destructive";
    return "bg-muted";
  }, [status.light]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Vault HUD error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-card p-4 space-y-4">
      {/* Header with status light */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", lightClass, status.light === "GREEN" && "animate-pulse")} />
          <span className="font-semibold text-foreground">
            {loading ? "Checking…" : status.label}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Risk Limit: <span className="font-mono text-foreground">{data?.effective_risk_limit?.toFixed(2) ?? "—"}%</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-xl bg-black/30 border border-primary/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Vault</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.vault_open ? "text-status-active" : "text-destructive"
          )}>
            {data?.vault_open ? "OPEN" : "CLOSED"}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-black/30 border border-primary/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cooldown</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.cooldown_active ? "text-status-warning" : "text-muted-foreground"
          )}>
            {data?.cooldown_active ? remainingLabel(data?.cooldown_remaining_minutes) : "None"}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-black/30 border border-primary/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Protection</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.protection_level === "LOCKDOWN" && "text-destructive",
            data?.protection_level === "RESTRICTED" && "text-orange-500",
            data?.protection_level === "CAUTION" && "text-status-warning",
            data?.protection_level === "NONE" && "text-muted-foreground"
          )}>
            {data?.protection_level ?? "—"}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-black/30 border border-primary/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Consistency</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.consistency_level === "CRITICAL" && "text-destructive",
            data?.consistency_level === "UNSTABLE" && "text-orange-500",
            data?.consistency_level === "WARNING" && "text-status-warning",
            data?.consistency_level === "STABLE" && "text-muted-foreground",
            data?.consistency_level === "EXCELLENT" && "text-status-active"
          )}>
            {data?.consistency_level ?? "—"}
          </span>
        </div>
      </div>

      {/* Block reason */}
      {!loading && data && !data.execution_allowed && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Blocked</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{data.block_reason}</p>
        </div>
      )}
    </div>
  );
}
