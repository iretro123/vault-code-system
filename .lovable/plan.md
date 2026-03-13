

# Fix: Consistent Balance Formatting Across the Page

## The Problem

Both "Your Trading Day" and the Analytics equity curve display the **same exact value** (`trackedBalance = startingBalance + totalPnl`). They are NOT different sources of truth — they're the same number formatted differently:

- **Hero** (line 498): `toLocaleString(undefined, { maximumFractionDigits: 0 })` → rounds to `$15,601`
- **Equity Curve** (line 62): `toLocaleString()` with no options → shows cents: `$15,600.68`

So `$15,601` vs `$15,600.68` is just a rounding display difference, not a data mismatch.

## The Fix

Standardize all balance displays to use **whole dollars** (no cents) everywhere for consistency and trust. One small change:

### File: `src/components/trade-os/EquityCurveCard.tsx`
- **Line 62**: Change `${currentBalance.toLocaleString()}` to `${currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
- **Line 67**: `totalChange.toFixed(0)` is already whole-dollar — no change needed

This is a single-line formatting fix. No data, logic, or layout changes.

