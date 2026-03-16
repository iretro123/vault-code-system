

# Plan: Fix Coach-Chat Balance Leak + Verify Full Pipeline

## Issue Found

**One leak**: The `coach-chat` edge function (line 224-230) computes the student's live balance as `startingBalance + tradePnlSum` but does NOT query `balance_adjustments`. When a user deposits $500, the AI coach still reports the old balance — a data mismatch that erodes trust.

Everything else is clean:
- **Equity curve**: Already splices adjustments by date (verified in `EquityCurveCard.tsx` lines 90-116)
- **HUD/trackedBalance**: Correctly uses `startingBalance + totalAdjustments + totalPnl` (line 181)
- **BalanceAdjustmentCard**: Properly wired with add/withdraw/delete/reset (lines 1232-1254)
- **Reset flow**: Already calls `clearAllAdjustments()` before zeroing profile balance (line 282)
- **AI Focus (trade-focus)**: Does not reference balance at all — no leak
- **Journal entries**: Pure text data — no balance dependency
- **Trade stats**: Derived purely from `trade_entries` — no contamination

## Fix

### File: `supabase/functions/coach-chat/index.ts`

Add a query for `balance_adjustments` alongside the existing parallel queries (~line 165):
```sql
SELECT amount FROM balance_adjustments WHERE user_id = $userId
```

Then update the balance calculation (line 230):
```
liveBalance = startingBalance + totalAdjustments + tradePnlSum
```

This is a ~5-line change in one file. No other files need changes.

