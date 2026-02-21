import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SmartReminderBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check if user has logged a trade this week
  const { entries } = useTradeLog();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const tradesThisWeek = entries?.filter(
    (e: any) => new Date(e.trade_date) >= startOfWeek
  ).length ?? 0;

  if (!user || tradesThisWeek > 0) return null;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-2">
      <div className="flex items-center justify-between rounded-xl bg-amber-500/[0.04] border border-amber-500/10 px-4 py-2">
        <p className="text-xs text-amber-300/70">
          You haven't logged a trade this week — post your setup for feedback.
        </p>
        <button
          onClick={() => navigate("/academy/trade")}
          className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors shrink-0"
        >
          Post a Trade
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
