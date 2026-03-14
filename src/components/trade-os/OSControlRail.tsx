import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";
import type { DayState } from "@/hooks/useSessionStage";

interface OSControlRailProps {
  activePlan: ApprovedPlan | null;
  trackedBalance: number | null;
  vaultAccountBalance: number;
  todayTradeCount: number;
  maxTradesPerDay: number;
  vaultStatus: string;
  lastBlockReason: string | null;
  dayState: DayState;
  dayStateStatus: string;
  dayStateCta: string;
  onQuickAction: () => void;
  onLogFromPlan?: (plan: ApprovedPlan) => void;
}

export function OSControlRail({
  activePlan, vaultStatus, lastBlockReason, dayState, dayStateStatus, dayStateCta,
  onQuickAction, onLogFromPlan,
}: OSControlRailProps) {
  const statusDot = vaultStatus === "GREEN" ? "bg-emerald-400" : vaultStatus === "YELLOW" ? "bg-amber-400" : "bg-red-400";
  const statusText = vaultStatus === "GREEN" ? "Clear" : vaultStatus === "YELLOW" ? "Caution" : "Blocked";
  const statusColor = vaultStatus === "GREEN" ? "text-emerald-400" : vaultStatus === "YELLOW" ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-2.5">
      {/* Day State Status Line */}
      <p className="text-[10px] text-muted-foreground/60 font-medium leading-snug">{dayStateStatus}</p>

      {/* Vault Status */}
      <div className="flex items-center gap-2">
        <span className={cn("w-[6px] h-[6px] rounded-full shrink-0", statusDot, vaultStatus === "GREEN" && "shadow-[0_0_8px_rgba(52,211,153,0.5)]")} />
        <span className={cn("text-[11px] font-bold", statusColor)}>{statusText}</span>
      </div>

      {/* Active Plan */}
      {activePlan ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-foreground">{activePlan.ticker || "—"}</span>
            <span className="text-[10px] text-muted-foreground/50">{activePlan.direction} · {activePlan.contracts_planned}ct</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 pl-3">
            ${Number(activePlan.entry_price_planned).toFixed(2)} · Max ${Number(activePlan.max_loss_planned).toFixed(0)}
          </p>
          {onLogFromPlan && dayState === "live_session" && (
            <Button size="sm" className="w-full h-7 text-[10px] rounded-lg gap-1" onClick={() => onLogFromPlan(activePlan)}>
              <CheckCircle2 className="h-3 w-3" /> Log Result
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/40 italic">No active plan</p>
      )}

      <div className="h-px bg-white/[0.04]" />

      {/* Restrictions */}
      {lastBlockReason && (
        <div className="flex items-start gap-1.5 py-1">
          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-400/70 leading-snug">{lastBlockReason}</p>
        </div>
      )}

      {/* Primary CTA — driven by DayState */}
      <Button
        size="sm"
        className="w-full h-7 text-[10px] font-semibold rounded-lg gap-1.5"
        onClick={onQuickAction}
      >
        {dayStateCta}
      </Button>
    </div>
  );
}
