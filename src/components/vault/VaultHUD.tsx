import React, { useMemo } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useVaultExecutionPermission } from "@/hooks/useVaultExecutionPermission";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, Lock, Activity, Timer, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function remainingLabel(minutes: number | null | undefined) {
  if (minutes == null || minutes <= 0) return "None";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function VaultHUD() {
  const { user } = useAuth();
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const { data: execData, loading: execLoading, status } = useVaultExecutionPermission();
  const navigate = useNavigate();

  const lightClass = useMemo(() => {
    if (!user) return "bg-muted";
    if (vaultState.vault_status === "GREEN") return "bg-emerald-500";
    if (vaultState.vault_status === "YELLOW") return "bg-amber-500";
    if (vaultState.vault_status === "RED") return "bg-rose-500";
    return "bg-muted";
  }, [user, vaultState.vault_status]);

  // Not authenticated
  if (!user) {
    return (
      <div className="vault-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <span className="font-semibold text-muted-foreground">Sign in to start</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => navigate("/auth")}
          >
            <LogIn className="h-4 w-4 mr-1" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Loading state - only show on initial load
  if (vaultLoading && !execData) {
    return (
      <div className="vault-card p-4 min-h-[140px]">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <span className="font-semibold text-muted-foreground">Checking Vault…</span>
        </div>
      </div>
    );
  }

  // Vault open — show full HUD, driven entirely by Vault State
  return (
    <div className="vault-card p-4 space-y-4 min-h-[140px]">
      {/* Header with status light — bound to vault_status */}
      <div className="flex items-center justify-between min-h-[24px]">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", lightClass, vaultState.vault_status === "GREEN" && "animate-pulse")} />
          <span className="font-semibold text-foreground">
            Vault {vaultState.vault_status}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Risk Limit: <span className="font-mono tabular-nums text-foreground">{execData?.effective_risk_limit?.toFixed(2) ?? "—"}%</span>
        </div>
      </div>

      {/* Metrics grid — bound to Vault State fields */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5 min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Risk Left</span>
          </div>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">
            ${vaultState.risk_remaining_today.toFixed(0)}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5 min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Trades</span>
          </div>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">
            {vaultState.trades_remaining_today}/{vaultState.max_trades_per_day}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5 min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Contracts</span>
          </div>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {vaultState.max_contracts_allowed}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5 min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cooldown</span>
          </div>
          <span className={cn(
            "text-sm font-medium tabular-nums",
            execData?.cooldown_active ? "text-amber-400" : "text-muted-foreground"
          )}>
            {execData?.cooldown_active ? remainingLabel(execData?.cooldown_remaining_minutes) : "None"}
          </span>
        </div>
      </div>

      {/* Block reason — from execution permission */}
      {execData && !execData.execution_allowed && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Action Required</span>
          </div>
          <p className="text-sm text-muted-foreground">{execData.block_reason}</p>
        </div>
      )}
    </div>
  );
}
