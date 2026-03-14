import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface EquityCurveCardProps {
  equityCurve: { date: string; balance: number }[];
  startingBalance: number;
}

const RANGES = ["1W", "1M", "3M", "All"] as const;
type Range = typeof RANGES[number];

const RANGE_DAYS: Record<Range, number | null> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "All": null,
};

const RANGE_LABELS: Record<Range, string> = {
  "1W": "Past Week",
  "1M": "Past Month",
  "3M": "Past 3 Months",
  "All": "All Time",
};

const COLOR_POS = "hsl(160, 84%, 39%)";
const COLOR_NEG = "hsl(0, 72%, 51%)";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, balance } = payload[0].payload;
  return (
    <div className="text-xs font-medium text-foreground/80 tabular-nums">
      {date && <span className="text-muted-foreground mr-2">{date}</span>}
      <span>${Math.round(balance).toLocaleString()}</span>
    </div>
  );
}

export function EquityCurveCard({ equityCurve, startingBalance }: EquityCurveCardProps) {
  const [range, setRange] = useState<Range>("All");

  const allData = useMemo(() => [
    { date: "", balance: startingBalance },
    ...equityCurve.map((p) => ({ date: p.date, balance: startingBalance + p.balance })),
  ], [equityCurve, startingBalance]);

  const filteredData = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days || allData.length <= 1) return allData;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // Find entries within range; always keep the point just before cutoff as baseline
    const inRange = allData.filter((pt, i) => i === 0 || !pt.date || pt.date >= cutoffStr);

    // If filtering left us with only the seed point, show all
    if (inRange.length <= 1) return allData;
    return inRange;
  }, [allData, range]);

  const rangeStart = filteredData[0]?.balance ?? startingBalance;
  const rangeEnd = filteredData[filteredData.length - 1]?.balance ?? startingBalance;
  const totalChange = rangeEnd - rangeStart;
  const pctChange = rangeStart > 0 ? (totalChange / rangeStart) * 100 : 0;
  const isPositive = totalChange >= 0;

  const { high, low, maxDrawdown } = useMemo(() => {
    let hi = -Infinity, lo = Infinity, peak = -Infinity, maxDd = 0;
    for (const pt of filteredData) {
      if (pt.balance > hi) hi = pt.balance;
      if (pt.balance < lo) lo = pt.balance;
      if (pt.balance > peak) peak = pt.balance;
      const dd = peak > 0 ? ((peak - pt.balance) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;
    }
    return { high: hi, low: lo, maxDrawdown: maxDd };
  }, [filteredData]);

  const strokeColor = isPositive ? COLOR_POS : COLOR_NEG;
  const gradId = "eq-grad-" + (isPositive ? "up" : "dn");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card">
      {/* Top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30"
        style={{ background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${strokeColor}, transparent)` }}
      />

      {/* Header */}
      <div className="relative px-4 pt-4 pb-1 md:px-5 md:pt-5 space-y-1">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
          ${Math.round(rangeEnd).toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}{Math.round(totalChange).toLocaleString()} ({pctChange.toFixed(1)}%)
          </span>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{RANGE_LABELS[range]}</span>
        </div>

        {/* Range selector */}
        <div className="flex gap-0.5 pt-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                range === r
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] md:h-[220px] px-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={false} axisLine={false} tickLine={false} width={0} />
            <RechartsTooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="natural"
              dataKey="balance"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] px-1">
        {[
          { label: "High", value: `$${Math.round(high).toLocaleString()}` },
          { label: "Low", value: `$${Math.round(low).toLocaleString()}` },
          { label: "Drawdown", value: `${maxDrawdown.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} className="py-3 px-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
