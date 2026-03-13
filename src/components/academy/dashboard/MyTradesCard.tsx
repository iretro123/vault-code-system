import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Plus, ArrowRight, Wallet, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTradeLog } from "@/hooks/useTradeLog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function MyTradesCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entries } = useTradeLog();

  const [accountBalance, setAccountBalance] = useState<number>(0);

  // Fetch real balance from profiles
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("account_balance")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAccountBalance(data.account_balance);
      });
  }, [user]);

  const balanceSet = accountBalance > 0;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTrades = useMemo(
    () => entries.filter((e) => e.trade_date === todayStr).length,
    [entries, todayStr]
  );

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekEntries = useMemo(
    () => entries.filter((e) => new Date(e.trade_date) >= startOfWeek),
    [entries, startOfWeek]
  );

  const tradesThisWeek = weekEntries.length;

  const winRate = useMemo(() => {
    if (weekEntries.length === 0) return "—";
    const wins = weekEntries.filter((e) => e.risk_reward > 0).length;
    return `${Math.round((wins / weekEntries.length) * 100)}%`;
  }, [weekEntries]);

  const pnl = useMemo(() => {
    if (weekEntries.length === 0) return "—";
    const total = weekEntries.reduce((s, e) => s + e.risk_reward * e.risk_used, 0);
    return total >= 0 ? `+$${total.toFixed(0)}` : `-$${Math.abs(total).toFixed(0)}`;
  }, [weekEntries]);

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
          <span className="text-sm font-semibold text-foreground">
            ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

function MetricMini({ label, value }: { label: string; value: string }) {
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
      <p className="text-base font-bold text-foreground/90">{value}</p>
    </div>
  );
}
