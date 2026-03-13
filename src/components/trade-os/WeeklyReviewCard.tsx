import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface WeeklyReviewCardProps {
  hasData: boolean;
}

export function WeeklyReviewCard({ hasData }: WeeklyReviewCardProps) {
  return (
    <div className="vault-glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Weekly Review</h3>
        {hasData && <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Ready</span>}
      </div>
      {hasData ? (
        <><p className="text-sm text-muted-foreground">Your weekly review is ready to generate.</p><Button size="sm">Generate Weekly Review</Button></>
      ) : (
        <><p className="text-sm text-muted-foreground">Need at least 1 week of trades.</p><Button size="sm" disabled>Generate Weekly Review</Button></>
      )}
    </div>
  );
}
