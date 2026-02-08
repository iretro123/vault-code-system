import React, { useMemo } from "react";
import { useVaultState } from "@/contexts/VaultStateContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SetBalancePrompt } from "./SetBalancePrompt";

interface VaultHUDProps {
  onBuyingNow?: () => void;
  onCloseTrade?: () => void;
  sessionPaused?: boolean;
}

export function VaultHUD({ onBuyingNow, onCloseTrade, sessionPaused }: VaultHUDProps) {
  const { user, profile } = useAuth();
  const { state: vaultState, loading: vaultLoading, refetch } = useVaultState();

  const inSafeMode = useMemo(() => {
    if (!profile?.initialized_at) return false;
    const safeModeUntil = new Date(profile.initialized_at).getTime() + 24 * 60 * 60 * 1000;
    return Date.now() < safeModeUntil;
  }, [profile?.initialized_at]);
  const navigate = useNavigate();

  const buyingDisabled =
    sessionPaused ||
    vaultState.vault_status === "RED" ||
    vaultState.open_trade ||
    vaultState.trades_remaining_today <= 0 ||
    vaultState.risk_remaining_today <= 0;

  const buyingBlockedReason = useMemo(() => {
    if (sessionPaused) return "Blocked: Session is paused.";
    if (vaultState.vault_status === "RED") return "Blocked: Vault is RED.";
    if (vaultState.open_trade) return "Blocked: Open trade not closed.";
    if (vaultState.trades_remaining_today <= 0) return "Blocked: No trades remaining.";
    if (vaultState.risk_remaining_today <= 0) return "Blocked: Daily risk limit reached.";
    return "";
  }, [sessionPaused, vaultState.vault_status, vaultState.open_trade, vaultState.trades_remaining_today, vaultState.risk_remaining_today]);

  // lightClass no longer needed — vault status shown only in VaultAuthorityHeader

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
      {/* Account Balance */}
      <div className="flex items-center justify-between min-h-[24px]">
        <span className="text-xs text-muted-foreground">Account Balance</span>
        <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
          ${vaultState.account_balance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Consolidated Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted/10 border border-border min-h-[56px]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{inSafeMode ? "Today's Risk (Conservative Start)" : "Today's Risk"}</p>
          <p className="text-sm font-mono font-semibold tabular-nums text-foreground">
            ${vaultState.risk_remaining_today.toFixed(0)}
            <span className="text-xs text-muted-foreground font-normal"> of ${vaultState.daily_loss_limit.toFixed(0)}</span>
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/10 border border-border min-h-[56px]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{inSafeMode ? "Starting Trade Allowance" : "Trades Remaining"}</p>
          <p className="text-sm font-mono font-semibold tabular-nums text-foreground">
            {vaultState.trades_remaining_today}
            <span className="text-xs text-muted-foreground font-normal"> / {vaultState.max_trades_per_day}</span>
          </p>
        </div>

        <div className="p-3 rounded-lg bg-muted/10 border border-border min-h-[56px]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Max Contracts</p>
          <p className="text-sm font-mono font-semibold tabular-nums text-foreground">
            {vaultState.max_contracts_allowed}
          </p>
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
        {buyingDisabled ? (
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            {buyingBlockedReason}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 text-center -mt-1">
            You'll confirm direction, size, and risk before anything happens.
          </p>
        )}

        <Button
          data-tour="sell-close"
          disabled={!vaultState.open_trade}
          variant="outline"
          className="w-full h-14 text-base font-bold uppercase tracking-wider rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 disabled:border-border disabled:text-muted-foreground"
          size="lg"
          onClick={onCloseTrade}
          title={!vaultState.open_trade ? "No open trade to close" : undefined}
        >
          Sell / Close Position
        </Button>
        {!vaultState.open_trade && (
          <p className="text-[11px] text-muted-foreground text-center -mt-1">
            No open trade to close.
          </p>
        )}
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
