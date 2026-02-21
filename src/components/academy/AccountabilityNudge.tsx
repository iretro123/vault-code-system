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
      className="rounded-2xl p-5 flex items-center gap-4 border border-white/[0.10]"
      style={{
        background: "rgba(255,255,255,0.07)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "hsl(38,92%,50%)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.92)" }}>
          You haven't journaled this week.
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
          Log 1 trade to stay on track.
        </p>
      </div>
      <Button size="sm" className="rounded-xl font-semibold shrink-0" onClick={() => navigate("/academy/trade")}>
        Go to Trade
      </Button>
    </div>
  );
}
