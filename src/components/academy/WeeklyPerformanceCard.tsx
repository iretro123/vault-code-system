import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

// Mock data — wire to real queries later
const WEEKLY_DATA = {
  trades: 7,
  ruleCompliance: 94,
  biggestMistake: "Entered before setup confirmed — skipped checklist on TSLA scalp.",
  focusNextWeek: "Wait for full confirmation before entering. No exceptions.",
};

export function WeeklyPerformanceCard() {
  return (
    <Card className="vault-card p-5 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Weekly Performance Report
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Trades
          </p>
          <p className="text-lg font-bold text-foreground">{WEEKLY_DATA.trades}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Rule Compliance
          </p>
          <p className="text-lg font-bold text-foreground">
            {WEEKLY_DATA.ruleCompliance}%
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Biggest Mistake
        </p>
        <p className="text-sm text-foreground/80">{WEEKLY_DATA.biggestMistake}</p>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Focus for Next Week
        </p>
        <p className="text-sm font-medium text-foreground">
          {WEEKLY_DATA.focusNextWeek}
        </p>
      </div>
    </Card>
  );
}
