import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface AccountabilityNudgeProps {
  hasJournaledThisWeek: boolean;
}

export function AccountabilityNudge({ hasJournaledThisWeek }: AccountabilityNudgeProps) {
  const navigate = useNavigate();

  if (hasJournaledThisWeek) return null;

  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: "rgba(247,249,252,0.94)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "hsl(38,92%,50%)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "hsl(220,25%,10%)" }}>
          You haven't journaled this week.
        </p>
        <p className="text-xs mt-0.5" style={{ color: "hsl(220,14%,45%)" }}>
          Log 1 trade to stay on track.
        </p>
      </div>
      <Button size="sm" className="rounded-xl font-semibold shrink-0" onClick={() => navigate("/academy/trade")}>
        Go to Trade
      </Button>
    </div>
  );
}
