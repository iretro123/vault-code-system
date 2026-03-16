

# Plan: Fix Analytics Not Updating + Fill Date Gaps in Equity Curve

## Root Causes Found

### 1. Equity curve only has points on trade dates (no gap-filling)
The `equityCurve` from `useTradeLog` creates data points ONLY for dates with trades. If a user has 3 trades on March 13 and 2 on March 15, the curve has 5 points across 2 dates — nothing in between, nothing before, nothing after. Deposits/withdrawals on non-trade days are invisible because there's no curve point to attach them to.

### 2. Curve doesn't extend to today
The curve ends at the last trade date. A deposit made today (with no trades) literally doesn't appear — there's no data point for today.

### 3. Adjustment-only days are missing
If a user deposits $1,000 on February 20 but doesn't trade that day, the curve has no point for Feb 20. The deposit is technically spliced into the next trade date's balance, but the visual jump is misleading — it looks like a big trade win, not a deposit.

### 4. No automatic re-render trigger after deposit/withdraw
The `EquityCurveCard` receives `adjustments` as a prop and the `trackedBalance` recomputes correctly. However, the equity curve data (`equityCurve` from `useTradeLog`) doesn't change when an adjustment is made — it only changes when trade entries change. The curve recalculates correctly via `allData` in the card, but if there are no trade data points near the adjustment date, the visual update is negligible or invisible.

## Fix

### File 1: `src/components/trade-os/EquityCurveCard.tsx`
**Fill date gaps + add today + show adjustment-only days**

In the `allData` builder, after mapping trade data points:
1. Collect all unique dates from both trades AND adjustments
2. Fill in missing calendar days between the earliest date and today
3. For gap days (no trade), carry forward the previous cumulative trade P/L
4. Always include today as the final point (current balance)
5. Deduplicate dates — if a date has both trades and adjustments, merge them

This ensures:
- The curve is continuous from first activity to today
- Deposits on non-trade days appear as visible balance shifts
- The curve always ends at the current real balance
- The range filters (1D, 1W, 1M, etc.) always have today's data

### File 2: `src/pages/academy/AcademyTrade.tsx`
**Trigger refetch of trade data after deposit/withdraw**

After a successful `addAdjustment` or `removeAdjustment`, also call `refetchTrades()` to bust the trade log cache. This forces all computed metrics (HUD, curve, stats) to re-derive from fresh data in the same render cycle.

Update the `onAddFunds`, `onWithdraw`, and `onDeleteAdjustment` handlers (lines 1234-1251) to call `refetchTrades()` after success.

## What This Fixes
- Equity curve shows full history from first trade/adjustment to today
- Deposits and withdrawals on non-trade days are visible as balance shifts
- After any add/withdraw action, the HUD balance, equity curve, and all stats refresh immediately
- Range filters (1D, 1W, etc.) always include today
- No changes to trade stats (win rate, P/L, compliance) — those remain purely trade-derived

