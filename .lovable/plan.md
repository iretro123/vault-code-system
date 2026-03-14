

# Upgrade: Premium Equity Curve with Dates, Richer Stats & Robinhood-Level Polish

## Current State
The equity curve shows a balance, change pill, range selector, chart, and 3 stats (High/Low/Drawdown). But it's missing:
- **No X-axis date labels** — the chart floats with no time reference
- **Tooltip is bare** — just date + balance, no context
- **Only 3 stats** — Robinhood shows more: win rate, total trades, avg gain, profit factor
- **No "starting balance" reference line** — hard to see breakeven visually
- **Range selector looks flat** — needs the raised-pill active state from the design system

## Plan

### File: `src/components/trade-os/EquityCurveCard.tsx`

**1. Add X-axis date ticks**
- Show 3-5 evenly spaced date labels along the bottom (e.g., "Mar 3", "Mar 8", "Mar 13")
- Use `format(date, "MMM d")` from date-fns
- Style: `text-[9px] text-muted-foreground/40`, no axis lines

**2. Upgrade tooltip to a floating card**
- Dark glassmorphic pill: `bg-black/80 backdrop-blur border border-white/10 rounded-lg px-3 py-2 shadow-xl`
- Show: date formatted as "Mon, Mar 10" + balance + daily P/L change from previous point
- Color-coded P/L line (green/red)

**3. Add a breakeven reference line**
- Dashed horizontal line at `startingBalance` using Recharts `ReferenceLine`
- Style: `stroke-dasharray="4 4"`, very subtle (`opacity 0.15`)

**4. Expand stats row from 3 to 5 columns**
- Keep: High, Low, Max Drawdown
- Add: **Win Rate** (% of positive-PnL data points) and **Avg Trade** (average P/L per trade)
- Pass these as new props from the parent, or compute from `equityCurve` data
- On mobile: 3 cols top row + 2 cols bottom row (grid responsive)

**5. Polish range selector**
- Active pill: `bg-white/[0.12] text-foreground shadow-sm` with smooth transition
- Add `1D` range option (today only) — useful for intraday traders

**6. Add "Since [date]" context**
- Below the range label, show the actual date range: e.g., "Mar 7 – Mar 14" in muted text
- Gives users exact context for what period they're viewing

### Props Change
Add optional props for richer stats:
```typescript
interface EquityCurveCardProps {
  equityCurve: { date: string; balance: number }[];
  startingBalance: number;
  winRate?: number;      // from useTradeLog
  totalTrades?: number;  // from useTradeLog
}
```

### Parent: `src/pages/academy/AcademyTrade.tsx`
- Pass `winRate={allTimeWinRate}` and `totalTrades={entries.length}` to EquityCurveCard

### No database changes needed.

