import { Shield, AlertTriangle, CheckCircle2, Plus, RefreshCw, Calendar, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const STATUS_COLORS: Record<string, { dot: string; label: string; ring: string }> = {
  GREEN: { dot: "bg-emerald-400", label: "text-emerald-400", ring: "ring-emerald-500/20" },
  YELLOW: { dot: "bg-amber-400", label: "text-amber-400", ring: "ring-amber-500/20" },
  RED: { dot: "bg-red-400", label: "text-red-400", ring: "ring-red-500/20" },
};

export function OSControlRail({ activePlan, vaultState, todayTradeCount, activeStage, onQuickAction, onLogFromPlan }: OSControlRailProps) {
  const sc = STATUS_COLORS[vaultState.vault_status] || STATUS_COLORS.RED;
  const totalTrades = vaultState.trades_remaining_today + todayTradeCount;
  const tradesUsed = totalTrades - vaultState.trades_remaining_today;
  const riskPercent = vaultState.daily_loss_limit > 0
    ? Math.max(0, Math.min(100, (vaultState.risk_remaining_today / vaultState.daily_loss_limit) * 100))
    : 0;

  const quickLabel = activeStage === "plan" ? "Check Trade" : activeStage === "live" ? "Log Result" : activeStage === "review" ? "Check In" : "Refresh AI";
  const QuickIcon = activeStage === "plan" ? Shield : activeStage === "live" ? Plus : activeStage === "review" ? ClipboardCheck : RefreshCw;

  return (
    <div className="space-y-4">
      {/* ── Vault Status ── */}
      <div className={cn("rounded-xl p-3.5 ring-1", sc.ring, "bg-muted/5")}>
        <div className="flex items-center gap-2.5 mb-0.5">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", sc.dot)} />
          <span className={cn("text-xs font-bold uppercase tracking-wider", sc.label)}>
            {vaultState.vault_status}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/50 pl-5">
          {vaultState.vault_status === "GREEN" ? "Clear to trade" : vaultState.vault_status === "YELLOW" ? "Caution — approaching limits" : "Trading blocked"}
        </p>
      </div>

      {/* ── Active Plan ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/40 px-0.5">Active Plan</p>
        {activePlan ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-sm font-bold text-foreground">{activePlan.ticker || "—"}</span>
              <span className="text-[10px] text-muted-foreground/60 uppercase">{activePlan.direction}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/60 pl-4">
              <span>Contracts: <strong className="text-foreground/80">{activePlan.contracts_planned}</strong></span>
              <span>Entry: <strong className="text-foreground/80">${Number(activePlan.entry_price_planned).toFixed(2)}</strong></span>
              <span>Max Loss: <strong className="text-foreground/80">${Number(activePlan.max_loss_planned).toFixed(0)}</strong></span>
              {activePlan.stop_price_planned && (
                <span>Stop: <strong className="text-foreground/80">${Number(activePlan.stop_price_planned).toFixed(2)}</strong></span>
              )}
            </div>
            {onLogFromPlan && (
              <Button size="sm" className="w-full mt-2.5 h-8 text-[11px] rounded-lg gap-1.5" onClick={() => onLogFromPlan(activePlan)}>
                <CheckCircle2 className="h-3 w-3" /> Log Result
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/15 bg-muted/5 p-3 text-center">
            <Shield className="h-4 w-4 text-muted-foreground/20 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground/40">No plan active</p>
          </div>
        )}
      </div>

      {/* ── Risk Remaining ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/40 px-0.5">Risk Budget</p>
        <div className="rounded-xl border border-border/15 bg-muted/5 p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className={cn("text-lg font-bold tabular-nums", vaultState.risk_remaining_today <= 0 ? "text-red-400" : "text-foreground")}>
              ${vaultState.risk_remaining_today.toFixed(0)}
            </span>
            <span className="text-[10px] text-muted-foreground/40">of ${vaultState.daily_loss_limit.toFixed(0)}</span>
          </div>
          <Progress value={riskPercent} className="h-1.5" />
        </div>
      </div>

      {/* ── Trades Remaining ── */}
      <div className="space-y-1.5">
        <p className="text-[9px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/40 px-0.5">Trades</p>
        <div className="rounded-xl border border-border/15 bg-muted/5 p-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums text-foreground">{tradesUsed}</span>
            <span className="text-[10px] text-muted-foreground/40">/ {totalTrades} used</span>
          </div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: totalTrades }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  i < tradesUsed ? "bg-primary" : "bg-muted/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Restrictions ── */}
      {vaultState.last_block_reason && (
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-3 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/80 leading-relaxed">{vaultState.last_block_reason}</p>
        </div>
      )}

      {/* ── Quick Action ── */}
      <Button
        size="sm"
        className="w-full h-9 text-xs font-semibold rounded-xl gap-1.5"
        onClick={onQuickAction}
      >
        <QuickIcon className="h-3.5 w-3.5" /> {quickLabel}
      </Button>
    </div>
  );
}
