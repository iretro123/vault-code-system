import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SmartReminderBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { entries } = useTradeLog();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const tradesThisWeek = entries?.filter(
    (e) => new Date(e.trade_date) >= startOfWeek
  ).length ?? 0;

  if (!user || tradesThisWeek > 0) return null;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-2">
      <div className="flex items-center justify-between rounded-2xl bg-amber-500/[0.04] border border-amber-500/[0.08] px-5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400/50 shrink-0" />
          <p className="text-[13px] text-amber-300/60 font-medium">
            You haven't logged a trade this week — post your setup for feedback.
          </p>
        </div>
        <button
          onClick={() => navigate("/academy/trade")}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/80 hover:text-amber-300 transition-colors shrink-0 px-3.5 py-2 rounded-xl hover:bg-amber-500/[0.06]"
        >
          Post a Trade
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
