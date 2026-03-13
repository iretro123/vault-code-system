import { Shield, AlertTriangle, CheckCircle2, Plus, RefreshCw, Calendar, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";
import type { VaultState } from "@/contexts/VaultStateContext";
import type { SessionStage } from "@/hooks/useSessionStage";

interface OSControlRailProps {
  activePlan: ApprovedPlan | null;
  vaultState: VaultState;
  todayTradeCount: number;
  activeStage: SessionStage;
  onQuickAction: () => void;
  onLogFromPlan?: (plan: ApprovedPlan) => void;
}

const STATUS_META: Record<string, { dot: string; label: string; text: string }> = {
  GREEN: { dot: "bg-emerald-400", label: "text-emerald-400", text: "Clear to trade" },
  YELLOW: { dot: "bg-amber-400", label: "text-amber-400", text: "Approaching limits" },
  RED: { dot: "bg-red-400", label: "text-red-400", text: "Trading blocked" },
};

export function OSControlRail({ activePlan, vaultState, todayTradeCount, activeStage, onQuickAction, onLogFromPlan }: OSControlRailProps) {
  const sm = STATUS_META[vaultState.vault_status] || STATUS_META.RED;
  const totalTrades = vaultState.trades_remaining_today + todayTradeCount;
  const tradesUsed = totalTrades - vaultState.trades_remaining_today;
  const riskPct = vaultState.daily_loss_limit > 0
    ? Math.max(0, Math.min(100, (vaultState.risk_remaining_today / vaultState.daily_loss_limit) * 100))
    : 0;

  const quickLabel = activeStage === "plan" ? "Check Trade" : activeStage === "live" ? "Log Result" : activeStage === "review" ? "Check In" : "Refresh AI";
  const QuickIcon = activeStage === "plan" ? Shield : activeStage === "live" ? Plus : activeStage === "review" ? ClipboardCheck : RefreshCw;

  return (
    <div className="space-y-4">
      {/* Vault Status */}
      <div className="flex items-center gap-2">
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", sm.dot)} />
        <span className={cn("text-[11px] font-bold uppercase tracking-wide", sm.label)}>
          {vaultState.vault_status}
        </span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto">{sm.text}</span>
      </div>

      {/* Active Plan */}
      <div>
        <p className="text-[10px] tracking-[0.1em] font-medium text-muted-foreground/30 uppercase mb-2">Active Plan</p>
        {activePlan ? (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-sm font-bold text-foreground">{activePlan.ticker || "—"}</span>
              <span className="text-[10px] text-muted-foreground/50 uppercase">{activePlan.direction}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/50 pl-3">
              <span>Contracts: <strong className="text-foreground/70">{activePlan.contracts_planned}</strong></span>
              <span>Entry: <strong className="text-foreground/70">${Number(activePlan.entry_price_planned).toFixed(2)}</strong></span>
              <span>Max Loss: <strong className="text-foreground/70">${Number(activePlan.max_loss_planned).toFixed(0)}</strong></span>
              {activePlan.stop_price_planned && (
                <span>Stop: <strong className="text-foreground/70">${Number(activePlan.stop_price_planned).toFixed(2)}</strong></span>
              )}
            </div>
            {onLogFromPlan && (
              <Button size="sm" className="w-full mt-2.5 h-7 text-[11px] rounded-lg gap-1" onClick={() => onLogFromPlan(activePlan)}>
                <CheckCircle2 className="h-3 w-3" /> Log Result
              </Button>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/30">No plan active</p>
        )}
      </div>

      {/* Risk Budget */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[10px] tracking-[0.1em] font-medium text-muted-foreground/30 uppercase">Risk Budget</p>
          <span className="text-[10px] text-muted-foreground/30">of ${vaultState.daily_loss_limit.toFixed(0)}</span>
        </div>
        <p className={cn("text-lg font-bold tabular-nums mb-1", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
          ${vaultState.risk_remaining_today.toFixed(0)}
        </p>
        <div className="h-1 rounded-full bg-muted/15 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", riskPct > 50 ? "bg-emerald-400/60" : riskPct > 20 ? "bg-amber-400/60" : "bg-red-400/60")}
            style={{ width: `${riskPct}%` }}
          />
        </div>
      </div>

      {/* Trades */}
      <div>
        <p className="text-[10px] tracking-[0.1em] font-medium text-muted-foreground/30 uppercase mb-1.5">Trades</p>
        <div className="flex items-baseline gap-1 mb-1.5">
          <span className="text-lg font-bold tabular-nums text-foreground">{tradesUsed}</span>
          <span className="text-[10px] text-muted-foreground/30">/ {totalTrades}</span>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: totalTrades }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-1 rounded-full",
                i < tradesUsed ? "bg-primary/70" : "bg-muted/15"
              )}
            />
          ))}
        </div>
      </div>

      {/* Restrictions */}
      {vaultState.last_block_reason && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/70 leading-relaxed">{vaultState.last_block_reason}</p>
        </div>
      )}

      {/* Quick Action */}
      <Button
        size="sm"
        className="w-full h-8 text-[11px] font-semibold rounded-lg gap-1.5"
        onClick={onQuickAction}
      >
        <QuickIcon className="h-3 w-3" /> {quickLabel}
      </Button>
    </div>
  );
}
