import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface WeeklyReviewCardProps {
  hasData: boolean;
}

export function WeeklyReviewCard({ hasData }: WeeklyReviewCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Weekly Review</h3>
        {hasData && (
          <span className="ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Ready
          </span>
        )}
      </div>
      {hasData ? (
        <>
          <p className="text-[11px] text-muted-foreground/60">Your weekly review is ready to generate.</p>
          <Button size="sm" className="h-8 text-[11px] rounded-lg w-full">Generate Weekly Review</Button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground/60">Need at least 1 week of trades.</p>
          <Button size="sm" disabled className="h-8 text-[11px] rounded-lg w-full">Generate Weekly Review</Button>
        </>
      )}
    </div>
  );
}
