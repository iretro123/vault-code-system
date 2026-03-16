

# Audit: Balance Adjustment Data Integrity — All Issues & Fixes

## Issues Found

### 1. Equity Curve in OS layout ignores adjustments (CRITICAL)
**Line 1238**: `startingBalance={startingBalance}` — missing `+ totalAdjustments`.
The classic layout (line 515) correctly passes `startingBalance + totalAdjustments`. The OS layout does not.
**Result**: Equity curve endpoint doesn't match the tracked balance in the HUD. User sees $12,232 in the HUD but the curve shows $11,732.

### 2. Equity curve doesn't splice adjustments by date (DISTORTION)
Both layouts pass `totalAdjustments` as a flat lump added to the baseline. A deposit made on March 10 retroactively shifts the entire curve — even January data points. This makes past performance look different than it was.
**Fix**: Pass raw `adjustments[]` array into `EquityCurveCard`. For each curve point, sum only adjustments with `date <= point.date`.

### 3. Reset doesn't clear adjustment history (DATA CORRUPTION)
`handleResetBalance` (line 280) zeros `profiles.account_balance` but leaves all `balance_adjustments` rows intact. After setting a new starting balance, those old deposits/withdrawals still apply — corrupting the new balance.
**Fix**: Add a `clearAll()` method to `useBalanceAdjustments` and call it during reset.

### 4. Dead code: old `handleUpdateBalance` back-calculation
Lines 292-309 still contain the legacy back-calculation logic (`newStarting = newBalance - totalPnl`). The state variables `showUpdateBalance`, `updateBalanceInput`, `updatingBalance` are unused. `TrackedBalanceCard` is still imported (line 39) but never rendered in the OS layout.
**Fix**: Remove dead code and unused import.

---

## Implementation Plan

### File 1: `src/components/trade-os/EquityCurveCard.tsx`
- Add optional `adjustments?: { date: string; amount: number }[]` prop
- In `allData` builder: for each equity point, compute `adjustmentsToDate = SUM(adj.amount WHERE adj.date <= point.date)` and add it to the balance: `startingBalance + adjustmentsToDate + cumulativePnl`
- Update tooltip to show adjustment amount when one falls on that date

### File 2: `src/hooks/useBalanceAdjustments.ts`
- Add `clearAll()` method that deletes all `balance_adjustments` for the user and resets local state

### File 3: `src/pages/academy/AcademyTrade.tsx`
- **Line 1238**: Pass `adjustments` prop and keep `startingBalance` as raw (adjustments are now spliced by date inside the card)
- **Line 515** (classic layout): Same treatment — pass `adjustments` prop
- **Lines 280-290**: Call `clearAll()` from `useBalanceAdjustments` during reset
- **Lines 292-309**: Remove dead `handleUpdateBalance` function
- **Lines 140-143**: Remove unused state variables (`showUpdateBalance`, `updateBalanceInput`, `updatingBalance`)
- **Line 39**: Remove unused `TrackedBalanceCard` import

### What stays untouched (verified correct)
- `trackedBalance` formula (line 182-185): `startingBalance + totalAdjustments + totalPnl` — correct for HUD display
- `PerformanceHUD` receives `trackedBalance` — correct
- All trade stats (win rate, P/L, compliance) derive purely from `trade_entries` — no contamination from adjustments
- `todayPnl` and `totalPnl` in `useTradeLog` use only `computePnl(entry)` — correct

