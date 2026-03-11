

# Fix: Floating-Point Precision Bug in VAULT Approval Engine

## What I Was Missing

The VAULT Approval engine uses **dynamic live balance**, not `profiles.account_balance`. The live balance is:

`$13,782.34 (starting) + $1,775.34 (trade P/L) = $15,557.68`

I kept quoting $13,782 because I was reading the raw profile row instead of following the code path that adds `totalPnl`. This changes the budgets:

- Risk budget (1%): **$155.58**
- Comfort budget (5%): **$777.88**
- Hard budget (8%): **$1,244.61**

At this correct balance, $7.50 × 1 contract = $750 cash, which is under the $777.88 comfort budget and should show **"Fits"**. The fact that it shows "Pass" confirms the floating-point round-trip bug identified earlier.

## Root Cause (same as previously diagnosed)

In `buildChoice()` in `src/lib/vaultApprovalCalc.ts`, the engine derives `exitPrice` from `riskBudget`, then recomputes `riskPerContract = contractPrice - exitPrice`. In IEEE 754 floating point, `7.50 - (7.50 - 1.5558)` does not exactly equal `1.5558`. The tiny error makes `totalRisk` exceed `riskBudget` by ~1e-14, flipping the status to "pass".

## Fix — One change in `src/lib/vaultApprovalCalc.ts`

In the `else` branch of `buildChoice()` (the case where exit is derived from risk budget and NOT clamped to the $0.01 floor):

**Before:**
```js
exitPrice = contractPrice - maxCutRoom;
if (exitPrice < 0.01) exitPrice = 0.01;
riskPerContract = contractPrice - exitPrice;
totalRisk = riskPerContract * 100 * n;
```

**After:**
```js
exitPrice = contractPrice - maxCutRoom;
if (exitPrice < 0.01) {
  exitPrice = 0.01;
  riskPerContract = contractPrice - 0.01;
  totalRisk = riskPerContract * 100 * n;
} else {
  // Use source values directly — no floating-point round-trip
  riskPerContract = maxCutRoom;
  totalRisk = riskBudget;
}
```

This is mathematically exact (not rounding): `maxCutRoom` IS `riskPerContract` by definition, and `riskBudget` IS `totalRisk` by construction.

## Test Updates in `src/test/vaultApprovalCalc.test.ts`

Add a regression test: for a ~$15,558 account, both $2.50 × 3 and $7.50 × 1 must return the same non-"pass" status, since both have identical $750 cash needs against the same budgets.

