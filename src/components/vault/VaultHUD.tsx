import React, { useMemo } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Shield, Lock, Timer, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SetBalancePrompt } from "./SetBalancePrompt";

interface VaultHUDProps {
  onBuyingNow?: () => void;
  onCloseTrade?: () => void;
}

export function VaultHUD({ onBuyingNow, onCloseTrade }: VaultHUDProps) {
  const { user } = useAuth();
  const { state: vaultState, loading: vaultLoading, refetch } = useVaultState();
  const navigate = useNavigate();

  const buyingDisabled =
    vaultState.vault_status === "RED" ||
    vaultState.open_trade ||
    vaultState.trades_remaining_today <= 0 ||
    vaultState.risk_remaining_today <= 0;

  const buyingBlockedReason = useMemo(() => {
    if (vaultState.vault_status === "RED") return "Blocked: Vault is RED.";
    if (vaultState.open_trade) return "Blocked: Open trade not closed.";
    if (vaultState.trades_remaining_today <= 0) return "Blocked: No trades remaining.";
    if (vaultState.risk_remaining_today <= 0) return "Blocked: Daily risk limit reached.";
    return "";
  }, [vaultState.vault_status, vaultState.open_trade, vaultState.trades_remaining_today, vaultState.risk_remaining_today]);

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
  // Show balance setup prompt if no balance set
  if (vaultState.account_balance <= 0) {
    return <SetBalancePrompt onComplete={refetch} />;
  }

  return (
    <div className="vault-card p-4 space-y-4 min-h-[140px]" data-tour="vault-status">
      {/* Header — bound to vault_status */}
      <div className="flex items-center justify-between min-h-[24px]">
        <div>
          <div className="flex items-center gap-3">
            <div className={cn("h-3 w-3 rounded-full", lightClass, vaultState.vault_status === "GREEN" && "animate-pulse")} />
            <span className="font-semibold text-foreground">
              Vault {vaultState.vault_status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            {vaultState.risk_remaining_today <= 0
              ? "Daily risk limit reached."
              : vaultState.loss_streak >= 2
              ? "Loss streak detected — reduced limits active."
              : "You are cleared to trade."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account Balance</p>
          <p className="text-sm font-mono font-semibold tabular-nums text-foreground">
            ${vaultState.account_balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Metrics grid — bound to Vault State only */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-xl bg-muted/10 border border-border min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Risk Left</span>
          </div>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">
            ${vaultState.risk_remaining_today.toFixed(0)}
          </span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Loss allowed today</p>
        </div>

        <div className="text-center p-2 rounded-xl bg-muted/10 border border-border min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Trades</span>
          </div>
          <span className="text-sm font-mono font-medium tabular-nums text-foreground">
            {vaultState.trades_remaining_today}/{vaultState.max_trades_per_day}
          </span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Trades remaining</p>
        </div>

        <div className="text-center p-2 rounded-xl bg-muted/10 border border-border min-h-[56px]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Contracts</span>
          </div>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {vaultState.max_contracts_allowed}
          </span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Max size per trade</p>
        </div>
      </div>

      {/* Active trade status */}
      {vaultState.open_trade && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-500">
            Active trade in progress. Close current trade to continue.
          </p>
        </div>
      )}

      {/* Execution Buttons — always render, disabled by vault rules */}
      <div className="space-y-2">
        <Button
          data-tour="buying-now"
          disabled={buyingDisabled}
          onClick={onBuyingNow}
          className="vault-cta w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl"
          size="lg"
        >
          Buying Now
        </Button>
        {buyingDisabled && (
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            {buyingBlockedReason}
          </p>
        )}

        <Button
          data-tour="sell-close"
          disabled={!vaultState.open_trade}
          variant="outline"
          className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 disabled:border-border disabled:text-muted-foreground"
          size="lg"
          onClick={onCloseTrade}
        >
          Sell / Close Position
        </Button>
      </div>

      {/* Next Action — derived from vault state */}
      <div className="p-3 rounded-lg bg-muted/10 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          {vaultState.vault_status === "RED"
            ? "Trading locked for today. Return tomorrow."
            : vaultState.open_trade
            ? "Next step: Close your open trade to continue."
            : "Next step: Click BUYING NOW to request trade approval."}
        </p>
      </div>
    </div>
  );
}
