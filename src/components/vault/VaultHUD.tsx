import React, { useMemo } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Shield, Lock, Timer, Activity, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function VaultHUD() {
  const { user } = useAuth();
  const { state: vaultState, loading: vaultLoading } = useVaultState();
  const navigate = useNavigate();

  const lightClass = useMemo(() => {
    if (!user) return "bg-muted";
    if (vaultState.vault_status === "GREEN") return "bg-emerald-500";
    if (vaultState.vault_status === "YELLOW") return "bg-amber-500";
    if (vaultState.vault_status === "RED") return "bg-rose-500";
    return "bg-muted";
  }, [user, vaultState.vault_status]);

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

  if (vaultLoading) {
    return (
      <div className="vault-card p-4 min-h-[140px]">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <span className="font-semibold text-muted-foreground">Checking Vault…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-card p-4 space-y-4 min-h-[140px]">
      {/* Header — bound to vault_status */}
      <div className="flex items-center min-h-[24px]">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", lightClass, vaultState.vault_status === "GREEN" && "animate-pulse")} />
          <span className="font-semibold text-foreground">
            Vault {vaultState.vault_status}
          </span>
        </div>
      </div>

      {/* Metrics grid — bound to Vault State only */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>
    </div>
  );
}
