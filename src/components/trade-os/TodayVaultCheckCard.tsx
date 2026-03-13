import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApprovedPlan } from "@/hooks/useApprovedPlans";

type TodayStatus = "incomplete" | "in_progress" | "complete";

interface TodayVaultCheckCardProps {
  activePlan: ApprovedPlan | null;
  todayTradeCount: number;
  todayStatus: TodayStatus;
  noTradeDay: boolean;
  onCheckTrade: () => void;
  onLogFromPlan: (plan: ApprovedPlan) => void;
  onLogUnplanned: () => void;
  onCancelPlan: (id: string) => void;
  onNoTradeDay: () => void;
  onCompleteCheckIn: () => void;
  onReviewFeedback: () => void;
}

export function TodayVaultCheckCard({
  activePlan, todayTradeCount, todayStatus, noTradeDay,
  onCheckTrade, onLogFromPlan, onLogUnplanned, onCancelPlan, onNoTradeDay, onCompleteCheckIn, onReviewFeedback,
}: TodayVaultCheckCardProps) {
  // State A: No active plan, not complete
  if (!activePlan && todayStatus === "incomplete" && !noTradeDay) {
    return (
      <div className="vault-glass-card p-4 md:p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Today's VAULT Check</h3>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">No plan</span>
        </div>
        <p className="text-xs text-muted-foreground">No trade approved yet today. Check a setup before you enter.</p>
        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={onCheckTrade}>
            <Shield className="h-3.5 w-3.5" /> Check a Trade
          </Button>
          <Button size="sm" variant="outline" onClick={onNoTradeDay}>Mark No-Trade Day</Button>
        </div>
      </div>
    );
  }

  // State B: Active plan, not yet logged
  if (activePlan && activePlan.status === "planned") {
    const statusStyles = activePlan.approval_status === "fits"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : activePlan.approval_status === "tight"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";
    return (
      <div className="vault-glass-card p-4 md:p-5 space-y-2.5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground">Today's VAULT Check</h3>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Plan ready</span>
        </div>
        <p className="text-xs text-muted-foreground">Your approved plan is ready. Log the result after the trade.</p>

        <div className="rounded-xl bg-muted/20 border border-border/30 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {activePlan.ticker && <span className="text-sm font-bold text-foreground">{activePlan.ticker}</span>}
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 text-muted-foreground">
              {activePlan.direction === "calls" ? "Calls" : "Puts"}
            </span>
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusStyles)}>
              {activePlan.approval_status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div><span className="text-muted-foreground">Contracts</span><br /><span className="font-semibold text-foreground">{activePlan.contracts_planned}</span></div>
            <div><span className="text-muted-foreground">Max loss</span><br /><span className="font-semibold text-red-400">${Number(activePlan.max_loss_planned).toFixed(0)}</span></div>
            <div><span className="text-muted-foreground">Entry</span><br /><span className="font-semibold text-foreground">${Number(activePlan.entry_price_planned).toFixed(2)}</span></div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => onLogFromPlan(activePlan)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Log Result
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCancelPlan(activePlan.id)}>Cancel Plan</Button>
        </div>
      </div>
    );
  }

  // State C: Complete or in-progress
  const badgeMap = {
    incomplete: { text: "Incomplete", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    in_progress: { text: "In progress", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    complete: { text: "Complete", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const badge = badgeMap[todayStatus];

  return (
    <div className="vault-glass-card p-4 md:p-5 space-y-2.5">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Today's VAULT Check</h3>
        <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
      </div>

      {todayStatus === "in_progress" && (
        <>
          <p className="text-xs text-muted-foreground">Trade logged. Complete your check-in to finish today's accountability.</p>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={onCompleteCheckIn}><CheckCircle2 className="h-3.5 w-3.5" /> Complete check-in</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onLogUnplanned}><Plus className="h-3.5 w-3.5" /> Log another trade</Button>
          </div>
        </>
      )}
      {todayStatus === "complete" && (
        <>
          <p className="text-xs text-emerald-400/80">{noTradeDay ? "No-trade day tracked. Good discipline." : "Today's accountability is complete. Review your feedback below."}</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onReviewFeedback}><Eye className="h-3.5 w-3.5" /> Review today's feedback</Button>
        </>
      )}
      {todayStatus === "incomplete" && noTradeDay && (
        <p className="text-xs text-emerald-400/80">No-trade day tracked. Good discipline. No setup taken today.</p>
      )}
    </div>
  );
}
