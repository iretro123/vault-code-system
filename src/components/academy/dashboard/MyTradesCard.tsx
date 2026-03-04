import { useNavigate } from "react-router-dom";
import { TrendingUp, Plus, ArrowRight, Wallet, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MyTradesCard() {
  const navigate = useNavigate();

  // For now, empty-state defaults — will connect to real data later
  const tradesThisWeek = 0;
  const winRate = "—";
  const pnl = "—";
  const balanceSet = false;
  const todayTrades = 0;

  return (
    <div className="vault-glass-card p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold text-foreground">My Trades</h2>
        </div>
        <button
          onClick={() => navigate("/academy/trade")}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Open <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* 3 Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricMini label="This Week" value={String(tradesThisWeek)} />
        <MetricMini label="Win Rate" value={winRate} />
        <MetricMini label="P/L" value={pnl} />
      </div>

      {/* Balance */}
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
          <span className="text-sm font-semibold text-foreground">$0.00</span>
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

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-center"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] font-medium text-muted-foreground/60 mb-1">
        {label}
      </p>
      <p className="text-base font-bold text-foreground/90">{value}</p>
    </div>
  );
}
