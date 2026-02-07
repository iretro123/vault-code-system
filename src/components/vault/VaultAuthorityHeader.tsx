import React from "react";
import { useVaultState, VaultStatusEnum } from "@/contexts/VaultStateContext";
import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldOff } from "lucide-react";

const STATUS_CONFIG: Record<VaultStatusEnum, {
  label: string;
  answer: string;
  icon: React.ElementType;
  dotClass: string;
  borderClass: string;
  bgClass: string;
}> = {
  GREEN: {
    label: "GREEN",
    answer: "You are cleared to trade.",
    icon: Shield,
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-500/20",
    bgClass: "bg-emerald-500/10",
  },
  YELLOW: {
    label: "YELLOW",
    answer: "Restricted — reduced limits active.",
    icon: ShieldAlert,
    dotClass: "bg-amber-500",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/10",
  },
  RED: {
    label: "RED",
    answer: "Trading is not permitted.",
    icon: ShieldOff,
    dotClass: "bg-rose-500",
    borderClass: "border-rose-500/20",
    bgClass: "bg-rose-500/10",
  },
};

export function VaultAuthorityHeader() {
  const { state, loading } = useVaultState();

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-pulse">
        <div className="h-5 bg-muted/30 rounded w-1/3" />
        <div className="h-8 bg-muted/30 rounded w-1/2" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-16 bg-muted/30 rounded" />
          <div className="h-16 bg-muted/30 rounded" />
          <div className="h-16 bg-muted/30 rounded" />
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[state.vault_status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-xl border bg-card p-5",
      config.borderClass
    )}>
      {/* Status Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className={cn("p-2 rounded-lg", config.bgClass)}>
          <Icon className={cn("h-5 w-5", {
            "text-emerald-500": state.vault_status === "GREEN",
            "text-amber-500": state.vault_status === "YELLOW",
            "text-rose-500": state.vault_status === "RED",
          })} />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", config.dotClass)} />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">
            Vault {config.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4 ml-[52px]">
        {config.answer}
      </p>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Risk Left
          </p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            ${state.risk_remaining_today.toFixed(0)}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Trades Left
          </p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {state.trades_remaining_today}
            <span className="text-xs text-muted-foreground font-normal">
              /{state.max_trades_per_day}
            </span>
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/10 border border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Max Contracts
          </p>
          <p className="text-lg font-mono font-semibold text-foreground tabular-nums">
            {state.max_contracts_allowed}
          </p>
        </div>
      </div>
    </div>
  );
}
