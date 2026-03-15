import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import type { TradeEntry } from "@/hooks/useTradeLog";
import { computePnl } from "@/hooks/useTradeLog";

interface WeeklyReviewCardProps {
  hasData: boolean;
  entries: TradeEntry[];
}

interface WeeklySummary {
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  compliance: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  greenDays: number;
  redDays: number;
}

function computeWeeklySummary(entries: TradeEntry[]): WeeklySummary {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const recent = entries.filter((e) => e.trade_date >= weekStr);

  if (recent.length === 0) {
    return { totalPnl: 0, winRate: 0, tradeCount: 0, compliance: 0, bestDay: null, worstDay: null, greenDays: 0, redDays: 0 };
  }

  const totalPnl = recent.reduce((s, e) => s + computePnl(e), 0);
  const wins = recent.filter((e) => e.risk_reward > 0).length;
  const winRate = Math.round((wins / recent.length) * 100);
  const compliant = recent.filter((e) => e.followed_rules).length;
  const compliance = Math.round((compliant / recent.length) * 100);

  // Group by day
  const dayMap = new Map<string, number>();
  for (const e of recent) {
    dayMap.set(e.trade_date, (dayMap.get(e.trade_date) || 0) + computePnl(e));
  }
  let bestDay: { date: string; pnl: number } | null = null;
  let worstDay: { date: string; pnl: number } | null = null;
  let greenDays = 0;
  let redDays = 0;
  for (const [date, pnl] of dayMap) {
    if (pnl >= 0) greenDays++;
    else redDays++;
    if (!bestDay || pnl > bestDay.pnl) bestDay = { date, pnl };
    if (!worstDay || pnl < worstDay.pnl) worstDay = { date, pnl };
  }

  return { totalPnl, winRate, tradeCount: recent.length, compliance, bestDay, worstDay, greenDays, redDays };
}

export function WeeklyReviewCard({ hasData, entries }: WeeklyReviewCardProps) {
  const [generated, setGenerated] = useState(false);
  const summary = useMemo(() => generated ? computeWeeklySummary(entries) : null, [generated, entries]);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Weekly Review</h3>
        {hasData && !generated && (
          <span className="ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Ready
          </span>
        )}
      </div>

      {generated && summary ? (
        <div className="space-y-3">
          {/* P/L + win rate */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Week P/L</p>
              <p className={`text-lg font-bold tabular-nums ${summary.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {summary.totalPnl >= 0 ? "+" : "-"}${Math.abs(summary.totalPnl).toFixed(0)}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Win Rate</p>
              <p className="text-lg font-bold tabular-nums text-foreground">{summary.winRate}%</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/20 p-2">
              <p className="text-sm font-bold tabular-nums text-foreground">{summary.tradeCount}</p>
              <p className="text-[9px] text-muted-foreground/60">Trades</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-2">
              <p className="text-sm font-bold tabular-nums text-foreground">{summary.compliance}%</p>
              <p className="text-[9px] text-muted-foreground/60">Compliance</p>
            </div>
            <div className="rounded-lg bg-muted/20 p-2">
              <p className="text-sm font-bold tabular-nums text-foreground">
                <span className="text-emerald-400">{summary.greenDays}</span>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-red-400">{summary.redDays}</span>
              </p>
              <p className="text-[9px] text-muted-foreground/60">G/R Days</p>
            </div>
          </div>

          {/* Best / worst day */}
          <div className="flex gap-2">
            {summary.bestDay && (
              <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 px-2 py-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground/50">Best Day</p>
                  <p className="text-[11px] font-semibold text-emerald-400 tabular-nums">+${summary.bestDay.pnl.toFixed(0)}</p>
                </div>
              </div>
            )}
            {summary.worstDay && summary.worstDay.pnl < 0 && (
              <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-red-500/[0.06] border border-red-500/10 px-2 py-1.5">
                <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground/50">Worst Day</p>
                  <p className="text-[11px] font-semibold text-red-400 tabular-nums">-${Math.abs(summary.worstDay.pnl).toFixed(0)}</p>
                </div>
              </div>
            )}
          </div>

          <Button size="sm" variant="outline" className="h-8 text-[11px] rounded-lg w-full border-white/[0.08]" onClick={() => setGenerated(false)}>
            Dismiss
          </Button>
        </div>
      ) : hasData ? (
        <>
          <p className="text-[11px] text-muted-foreground/60">Your weekly review is ready to generate.</p>
          <Button size="sm" className="h-8 text-[11px] rounded-lg w-full" onClick={() => setGenerated(true)}>Generate Weekly Review</Button>
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
