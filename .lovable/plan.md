

# Fix: Equity Curve Color & Working Range Selector

## Problem 1: Grey Chart
The chart stroke uses `hsl(var(--status-active))` but this CSS variable **does not exist**. The defined variables are `--status-success`, `--status-warning`, and `--status-danger`. Since the variable is undefined, the browser renders the stroke as transparent/grey.

**Fix**: Replace all `hsl(var(--status-active))` references with direct emerald/red hex colors that match the design system (emerald-400 for positive, rose-400 for negative). This also fixes the Tailwind classes `bg-status-active/15` and `text-status-active` which similarly resolve to nothing.

## Problem 2: Range Selector Does Nothing
The 1W/1M/3M/All buttons set `range` state but `chartData` always shows all data. The range is never used to filter.

**Fix**: Filter `chartData` based on the selected range by computing a cutoff date (7 days for 1W, 30 for 1M, 90 for 3M, no filter for All). Recalculate the change pill (P/L and %) relative to the filtered window, and update the "All Time" label to match (e.g., "Past Week", "Past Month").

## Problem 3: Tooltip Shows Cents
The tooltip still uses raw `toLocaleString()` — should be whole dollars.

## File: `src/components/trade-os/EquityCurveCard.tsx`

Changes:
1. Replace `hsl(var(--status-active))` → `#34d399` (emerald-400) and `hsl(var(--destructive))` → `#fb7185` (rose-400) for reliable color rendering
2. Add `filteredData` memo that slices `chartData` based on `range` using date cutoffs
3. Compute `rangeChange` and `rangePct` from `filteredData` instead of always using all-time
4. Update the label next to the change pill to reflect the active range ("Past Week", "Past Month", etc.)
5. Recalculate High/Low/Drawdown stats from `filteredData`
6. Fix tooltip to use whole-dollar formatting

No other files need changes. No database changes.

