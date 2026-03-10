

## Bug: Trade P/L Shows $1 Instead of Actual Profit

### Root Cause

The auto-calculated PNL formula in `LogTradeSheet.tsx` line 95 is:

```
(exit - entry) * size
```

For the user's example: entry=0.68, exit=1.20, 2 contracts → `(1.20 - 0.68) * 2 = $1.04` → displayed as **$1** after `.toFixed(0)` rounding.

The problem: **options contracts represent 100 shares each**, so the correct formula is `(exit - entry) * size * 100`. The real P/L should be `0.52 * 2 * 100 = $104`.

Since the form only offers "Calls" and "Puts" as direction options, it's always options trading. The 100x multiplier is missing.

When the user doesn't manually override the P/L field, the auto-calculated value (missing the multiplier) gets stored as `risk_used`, making every trade show as ~$1.

### Fix — `src/components/academy/LogTradeSheet.tsx`

**Line 95**: Change the auto-calculation to include the 100x options multiplier:

```typescript
const raw = (exit - entry) * size * 100;
```

**Line 219**: Update the helper text to reflect the correct formula:

```
Auto-calculated from (exit − entry) × contracts × 100
```

One file, two small edits. Existing trades already in the database with manually overridden PNL values are unaffected — only the auto-calc formula changes.

