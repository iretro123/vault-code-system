import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Plus, ArrowRight, Wallet, CheckCircle2, Circle, ArrowUpRight, ArrowDownRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { useBalanceAdjustments } from "@/hooks/useBalanceAdjustments";

export function MyTradesCard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    entries,
    refetch,
    allTimeWinRate,
    todayPnl,
    totalPnl,
    complianceRate,
  } = useTradeLog();

  // Refetch on mount to ensure fresh data when navigating back from Trade OS
  useEffect(() => {
    refetch();
  }, []);

  const { totalAdjustments } = useBalanceAdjustments();

  const accountBalance = (profile as any)?.account_balance ?? 0;
  const balanceSet = accountBalance > 0;
  const trackedBalance = accountBalance + totalAdjustments + totalPnl;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTrades = entries.filter((e) => e.trade_date === todayStr).length;

  return (
    <div className="vault-premium-card p-5 space-y-3 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Trade OS</h2>
        </div>
        <button
          onClick={() => navigate("/academy/trade")}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Open <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* 3 Metrics — aligned with Trade OS HUD */}
      <div className="grid grid-cols-3 gap-2">
        <MetricMini
          label="Today P/L"
          value={todayPnl === 0 ? "$0" : todayPnl > 0 ? `+$${todayPnl.toFixed(0)}` : `-$${Math.abs(todayPnl).toFixed(0)}`}
          accent={todayPnl > 0 ? "text-emerald-400" : todayPnl < 0 ? "text-red-400" : undefined}
        />
        <MetricMini
          label="Win Rate"
          value={entries.length > 0 ? `${allTimeWinRate}%` : "—"}
          accent={allTimeWinRate >= 50 ? "text-emerald-400" : "text-amber-400"}
        />
        <MetricMini
          label="Compliance"
          value={entries.length > 0 ? `${complianceRate}%` : "—"}
          accent={complianceRate >= 80 ? "text-emerald-400" : "text-amber-400"}
        />
      </div>

      {/* Balance — uses same formula as Trade OS */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {balanceSet ? "Tracked Balance" : "No balance set"}
          </span>
        </div>
        {balanceSet ? (
          <span className="text-sm font-semibold text-foreground">
            ${trackedBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        ) : (
          <button
            onClick={() => navigate("/academy/trade")}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Set up →
          </button>
        )}
      </div>

      {/* Today's status */}
      <div className="flex items-center gap-2">
        {todayTrades > 0 ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
        <span className="text-xs text-muted-foreground">
          {todayTrades === 0
            ? "No trades today"
            : `${todayTrades} trade${todayTrades > 1 ? "s" : ""} logged today`}
        </span>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-1">
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => navigate("/academy/trade")}
        >
          <Plus className="h-3.5 w-3.5" />
          Log Trade
        </Button>
      </div>
    </div>
  );
}

function MetricMini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2 text-center"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/60 mb-1">
        {label}
      </p>
      <p className={`text-base font-bold ${accent || "text-foreground/90"}`}>{value}</p>
    </div>
  );
}
