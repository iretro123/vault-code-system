import { useState } from "react";
import { BarChart3 } from "lucide-react";

interface PerformanceBreakdownCardProps {
  symbolStats: { symbol: string; trades: number; wins: number; winRate: number; totalPnl: number }[];
  dayStats: { day: string; trades: number; wins: number; winRate: number }[];
}

export function PerformanceBreakdownCard({ symbolStats, dayStats }: PerformanceBreakdownCardProps) {
  const [tab, setTab] = useState<"symbol" | "day">("symbol");
  const topSymbols = symbolStats.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Performance Breakdown</h3>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["symbol", "day"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors duration-100 ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t === "symbol" ? "By Symbol" : "By Day"}
            </button>
          ))}
        </div>
      </div>

      {tab === "symbol" && (
        <div className="space-y-2">
          {topSymbols.map((s) => (
            <div key={s.symbol} className="flex items-center gap-3 rounded-xl bg-muted/20 border border-border/30 px-3 py-2.5">
              <span className="text-sm font-bold text-foreground min-w-[50px]">{s.symbol}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.winRate}%`,
                      background: s.winRate >= 50 ? "linear-gradient(90deg, #34d399, #6ee7b7)" : "linear-gradient(90deg, #f87171, #fca5a5)",
                    }}
                  />
                </div>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                {s.winRate}%
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{s.trades}t</span>
              <span className={`text-xs font-semibold tabular-nums ${s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {s.totalPnl >= 0 ? "+" : ""}${Math.abs(s.totalPnl).toFixed(0)}
              </span>
            </div>
          ))}
          {symbolStats.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No symbol data yet.</p>}
        </div>
      )}

      {tab === "day" && (
        <div className="grid grid-cols-5 md:grid-cols-7 gap-2">
          {dayStats.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-1 rounded-xl bg-muted/20 border border-border/30 px-2 py-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">{d.day}</span>
              <span className={`text-sm font-bold tabular-nums ${d.winRate >= 50 ? "text-emerald-400" : d.trades > 0 ? "text-red-400" : "text-muted-foreground/40"}`}>
                {d.trades > 0 ? `${d.winRate}%` : "—"}
              </span>
              <span className="text-[9px] text-muted-foreground/60 tabular-nums">{d.trades}t</span>
            </div>
          ))}
          {dayStats.length === 0 && <p className="text-xs text-muted-foreground text-center py-3 col-span-full">No day data yet.</p>}
        </div>
      )}
    </div>
  );
}
