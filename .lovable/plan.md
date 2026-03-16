

# Fix: Dashboard Balance Doesn't Match Trade OS

## Root Cause

**MyTradesCard** (dashboard) calculates balance as:
```
trackedBalance = profile.account_balance + totalPnl
```

**AcademyTrade** (Trade OS) calculates balance as:
```
trackedBalance = startingBalance + totalAdjustments + totalPnl
```

The dashboard **completely ignores balance adjustments** (deposits/withdrawals). If a user deposits $500, Trade OS shows the correct balance but the dashboard card doesn't.

## Fix

### File: `src/components/academy/dashboard/MyTradesCard.tsx`

Import and use `useBalanceAdjustments` hook to include `totalAdjustments` in the balance calculation, matching the Trade OS formula exactly:

```
trackedBalance = accountBalance + totalAdjustments + totalPnl
```

This is a ~3-line change:
1. Import `useBalanceAdjustments`
2. Destructure `totalAdjustments` from it
3. Update the `trackedBalance` formula to include `totalAdjustments`

One file, one formula alignment. Both surfaces will then use the same canonical calculation.

