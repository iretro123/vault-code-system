import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format } from "date-fns";

interface Adjustment {
  date: string;
  amount: number;
}

interface EquityCurveCardProps {
  equityCurve: { date: string; balance: number }[];
  startingBalance: number;
  winRate?: number;
  totalTrades?: number;
  /** Raw adjustments array — spliced by date for accurate historical curve */
  adjustments?: Adjustment[];
}

const RANGES = ["1D", "1W", "1M", "3M", "All"] as const;
type Range = typeof RANGES[number];

const RANGE_DAYS: Record<Range, number | null> = {
  "1D": 1, "1W": 7, "1M": 30, "3M": 90, "All": null,
};

const RANGE_LABELS: Record<Range, string> = {
  "1D": "Today", "1W": "Past Week", "1M": "Past Month", "3M": "Past 3 Months", "All": "All Time",
};

const COLOR_POS = "hsl(160, 84%, 39%)";
const COLOR_NEG = "hsl(0, 72%, 51%)";

function formatTickDate(dateStr: string) {
  if (!dateStr) return "";
  try { return format(new Date(dateStr + "T12:00:00"), "MMM d"); } catch { return dateStr; }
}

/** Sum all adjustment amounts where adjustment date <= given date */
function sumAdjustmentsToDate(adjustments: Adjustment[], dateStr: string): number {
  let total = 0;
  for (const adj of adjustments) {
    if (adj.date <= dateStr) total += adj.amount;
  }
  return total;
}

/** Find adjustment on exact date */
function adjustmentOnDate(adjustments: Adjustment[], dateStr: string): number {
  let total = 0;
  for (const adj of adjustments) {
    if (adj.date === dateStr) total += adj.amount;
  }
  return total;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { date, balance, tradePnlChange, adjustmentAmount } = payload[0].payload;

  return (
    <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 shadow-xl space-y-0.5">
      {date && (
        <p className="text-[10px] text-muted-foreground/60">
          {(() => { try { return format(new Date(date + "T12:00:00"), "EEE, MMM d"); } catch { return date; } })()}
        </p>
      )}
      <p className="text-sm font-semibold tabular-nums text-foreground">
        ${Math.round(balance).toLocaleString()}
      </p>
      {tradePnlChange != null && tradePnlChange !== 0 && (
        <p className={`text-[11px] font-medium tabular-nums ${tradePnlChange >= 0 ? "text-emerald-400" : "text-destructive"}`}>
          Trade: {tradePnlChange >= 0 ? "+" : ""}{Math.round(tradePnlChange).toLocaleString()}
        </p>
      )}
      {adjustmentAmount != null && adjustmentAmount !== 0 && (
        <p className="text-[11px] font-medium tabular-nums text-blue-400">
          {adjustmentAmount > 0 ? "Deposit" : "Withdrawal"}: {adjustmentAmount > 0 ? "+" : ""}{Math.round(adjustmentAmount).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export function EquityCurveCard({ equityCurve, startingBalance, winRate, totalTrades, adjustments = [] }: EquityCurveCardProps) {
  const [range, setRange] = useState<Range>("All");

  // Build equity data with time-aware adjustment splicing
  // Each point: balance = startingBalance + adjustmentsToDate + cumulativeTradePnl
  const allData = useMemo(() => {
    const seed = {
      date: "",
      balance: startingBalance,
      tradePnlChange: null as number | null,
      adjustmentAmount: null as number | null,
    };

    let prevTradePnl = 0;
    const mapped = equityCurve.map((p) => {
      const cumulativeTradePnl = p.balance; // equityCurve[].balance is cumulative P/L from trades
      const adjToDate = sumAdjustmentsToDate(adjustments, p.date);
      const adjOnDate = adjustmentOnDate(adjustments, p.date);
      const bal = startingBalance + adjToDate + cumulativeTradePnl;
      const tradeDelta = cumulativeTradePnl - prevTradePnl;
      prevTradePnl = cumulativeTradePnl;

      return {
        date: p.date,
        balance: bal,
        tradePnlChange: tradeDelta,
        adjustmentAmount: adjOnDate !== 0 ? adjOnDate : null,
      };
    });

    return [seed, ...mapped];
  }, [equityCurve, startingBalance, adjustments]);

  const filteredData = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days || allData.length <= 1) return allData;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const inRange = allData.filter((pt, i) => i === 0 || !pt.date || pt.date >= cutoffStr);
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
    return {
      high: hi === -Infinity ? startingBalance : hi,
      low: lo === Infinity ? startingBalance : lo,
      maxDrawdown: maxDd,
    };
  }, [filteredData, startingBalance]);

  const dateRangeLabel = useMemo(() => {
    const dates = filteredData.filter((d) => d.date);
    if (dates.length === 0) return "";
    const first = dates[0].date;
    const last = dates[dates.length - 1].date;
    try {
      const f = format(new Date(first + "T12:00:00"), "MMM d");
      const l = format(new Date(last + "T12:00:00"), "MMM d");
      return f === l ? f : `${f} – ${l}`;
    } catch { return ""; }
  }, [filteredData]);

  const strokeColor = isPositive ? COLOR_POS : COLOR_NEG;
  const gradId = "eq-grad-" + (isPositive ? "up" : "dn");

  const stats = [
    { label: "High", value: `$${Math.round(high).toLocaleString()}` },
    { label: "Low", value: `$${Math.round(low).toLocaleString()}` },
    { label: "Drawdown", value: `${maxDrawdown.toFixed(1)}%` },
    ...(winRate != null ? [{ label: "Win Rate", value: `${winRate}%` }] : []),
    ...(totalTrades != null ? [{ label: "Trades", value: String(totalTrades) }] : []),
  ];

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
        {dateRangeLabel && (
          <p className="text-[10px] text-muted-foreground/40 tabular-nums">{dateRangeLabel}</p>
        )}

        {/* Range selector */}
        <div className="flex gap-0.5 pt-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-100 ${
                range === r
                  ? "bg-white/[0.12] text-foreground shadow-sm"
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
          <AreaChart data={filteredData} margin={{ top: 8, right: 0, bottom: 16, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground) / 0.4)" }}
              tickFormatter={formatTickDate}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis domain={["auto", "auto"]} tick={false} axisLine={false} tickLine={false} width={0} />
            <ReferenceLine
              y={startingBalance}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.15}
            />
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
      <div className="grid grid-cols-3 md:grid-cols-5 divide-x divide-white/[0.06] border-t border-white/[0.06] px-1">
        {stats.map((s) => (
          <div key={s.label} className="py-3 px-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
