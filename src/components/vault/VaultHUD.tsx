import React, { useMemo } from "react";
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
  const { data, loading, error, status } = useVaultExecutionPermission();
  const navigate = useNavigate();

  const lightClass = useMemo(() => {
    if (!user) return "bg-muted";
    if (status.light === "GREEN") return "bg-emerald-500";
    if (status.light === "YELLOW") return "bg-amber-500";
    if (status.light === "RED") return "bg-rose-500";
    return "bg-muted";
  }, [user, status.light]);

  const scrollToRitual = () => {
    const ritualCard = document.querySelector('[data-ritual-gate]');
    if (ritualCard) {
      ritualCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      ritualCard.classList.add('ring-2', 'ring-primary');
      setTimeout(() => ritualCard.classList.remove('ring-2', 'ring-primary'), 2000);
    }
  };

  // Not authenticated — neutral prompt, not an error
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

  // True system error (network/RPC failure)
  if (error) {
    return (
      <div className="vault-card p-4 border-rose-500/30">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Connection error: {error}</span>
        </div>
      </div>
    );
  }

  // Vault closed — neutral guidance with action (NOT an error)
  if (!loading && data && !data.vault_open) {
    return (
      <div className="vault-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-muted" />
          <span className="font-semibold text-foreground">Vault closed — complete Daily Ritual to unlock</span>
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={scrollToRitual}
        >
          Start Ritual
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="vault-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-muted animate-pulse" />
          <span className="font-semibold text-muted-foreground">Checking Vault…</span>
        </div>
      </div>
    );
  }

  // Vault open — show full HUD
  return (
    <div className="vault-card p-4 space-y-4">
      {/* Header with status light */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full", lightClass, status.light === "GREEN" && "animate-pulse")} />
          <span className="font-semibold text-foreground">
            {status.label}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Risk Limit: <span className="font-mono text-foreground">{data?.effective_risk_limit?.toFixed(2) ?? "—"}%</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Vault</span>
          </div>
          <span className="text-sm font-medium text-emerald-400">OPEN</span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cooldown</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.cooldown_active ? "text-amber-400" : "text-muted-foreground"
          )}>
            {data?.cooldown_active ? remainingLabel(data?.cooldown_remaining_minutes) : "None"}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Protection</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.protection_level === "LOCKDOWN" && "text-rose-400",
            data?.protection_level === "RESTRICTED" && "text-orange-400",
            data?.protection_level === "CAUTION" && "text-amber-400",
            data?.protection_level === "NONE" && "text-muted-foreground"
          )}>
            {data?.protection_level ?? "—"}
          </span>
        </div>

        <div className="text-center p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Consistency</span>
          </div>
          <span className={cn(
            "text-sm font-medium",
            data?.consistency_level === "CRITICAL" && "text-rose-400",
            data?.consistency_level === "UNSTABLE" && "text-orange-400",
            data?.consistency_level === "WARNING" && "text-amber-400",
            data?.consistency_level === "STABLE" && "text-muted-foreground",
            data?.consistency_level === "EXCELLENT" && "text-emerald-400"
          )}>
            {data?.consistency_level ?? "—"}
          </span>
        </div>
      </div>

      {/* Block reason — shown as guidance, not error */}
      {data && !data.execution_allowed && (
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Action Required</span>
          </div>
          <p className="text-sm text-muted-foreground">{data.block_reason}</p>
        </div>
      )}
    </div>
  );
}