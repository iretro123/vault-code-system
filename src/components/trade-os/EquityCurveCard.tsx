import { useMemo } from "react";
import { Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

interface EquityCurveCardProps {
  equityCurve: { date: string; balance: number }[];
  startingBalance: number;
}

export function EquityCurveCard({ equityCurve, startingBalance }: EquityCurveCardProps) {
  const chartData = useMemo(() => {
    return [
      { date: "", balance: startingBalance },
      ...equityCurve.map((p) => ({ date: p.date, balance: startingBalance + p.balance })),
    ];
  }, [equityCurve, startingBalance]);

  const currentBalance = chartData[chartData.length - 1]?.balance ?? startingBalance;
  const totalChange = currentBalance - startingBalance;
  const isPositive = totalChange >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-4 md:p-5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Equity Curve</h3>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? "+" : ""}{totalChange.toFixed(0)} ({((totalChange / startingBalance) * 100).toFixed(1)}%)
        </span>
      </div>
      <div className="h-[140px] md:h-[160px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isPositive ? "#34d399" : "#f87171"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={false} axisLine={false} tickLine={false} width={0} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
              formatter={(val: number) => [`$${val.toLocaleString()}`, "Balance"]}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? "#34d399" : "#f87171"}
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: isPositive ? "#34d399" : "#f87171" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
