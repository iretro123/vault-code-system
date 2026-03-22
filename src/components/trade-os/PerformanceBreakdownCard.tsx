import { useState } from "react";
import { BarChart3, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceBreakdownCardProps {
  symbolStats: { symbol: string; trades: number; wins: number; winRate: number; totalPnl: number }[];
  dayStats: { day: string; trades: number; wins: number; winRate: number }[];
}

export function PerformanceBreakdownCard({ symbolStats, dayStats }: PerformanceBreakdownCardProps) {
  const [tab, setTab] = useState<"symbol" | "day">("symbol");
  const topSymbols = symbolStats.slice(0, 6);
  const isEmpty = symbolStats.length === 0 && dayStats.length === 0;

  return (
    <div className={cn(
      "rounded-2xl border border-white/[0.06] bg-card p-4 space-y-3 relative overflow-hidden transition-opacity duration-200",
      isEmpty && "opacity-50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-foreground">Performance</h3>
        </div>
        {/* iOS segmented control */}
        <div className="flex rounded-lg bg-black/25 p-0.5">
          {(["symbol", "day"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors duration-100",
                tab === t
                  ? "bg-white/[0.08] text-foreground shadow-sm"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              {t === "symbol" ? "Symbol" : "Day"}
            </button>
          ))}
        </div>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/20 flex items-center justify-center">
            <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center max-w-[180px] leading-relaxed">
            Log trades to unlock performance insights
          </p>
        </div>
      )}

      {!isEmpty && tab === "symbol" && (
        <div className="space-y-1">
          {topSymbols.map((s) => (
            <div key={s.symbol} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-2.5 py-2">
              <span className="text-xs font-bold text-foreground min-w-[40px]">{s.symbol}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.winRate}%`,
                      background: s.winRate >= 50
                        ? "linear-gradient(90deg, hsl(var(--chart-2)), hsl(var(--chart-2) / 0.6))"
                        : "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.6))",
                    }}
                  />
                </div>
              </div>
              <span className={cn("text-[10px] font-semibold tabular-nums", s.winRate >= 50 ? "text-emerald-400" : "text-red-400")}>
                {s.winRate}%
              </span>
              <span className="text-[9px] text-muted-foreground/40 tabular-nums">{s.trades}t</span>
              <span className={cn("text-[10px] font-semibold tabular-nums", s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                {s.totalPnl >= 0 ? "+" : ""}${Math.abs(s.totalPnl).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isEmpty && tab === "day" && (
        <div className="grid grid-cols-5 md:grid-cols-7 gap-1.5">
          {dayStats.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-1.5 py-2.5">
              <span className="text-[9px] font-medium text-muted-foreground/50 uppercase">{d.day}</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                d.winRate >= 50 ? "text-emerald-400" : d.trades > 0 ? "text-red-400" : "text-muted-foreground/20"
              )}>
                {d.trades > 0 ? `${d.winRate}%` : "—"}
              </span>
              <span className="text-[8px] text-muted-foreground/40 tabular-nums">{d.trades}t</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
