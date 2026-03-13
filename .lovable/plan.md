

# Fix: Today's Budget Must Use the Planner's Risk Engine

## The Problem

There are **two different risk engines** in this codebase:

1. **`vaultConstants.ts`** — uses fixed dollar caps (MAX_CONTRACT=$50). For a $15K STANDARD account: daily_loss_limit = $100, risk_per_trade = $50. These are options-contract enforcement limits.

2. **`tradePlannerCalc.ts` / `vaultApprovalCalc.ts`** — uses percentage-based tier risk. For a $15K "Medium" account: riskBudget = 1% = **$150**. When a trader picks 1 contract at $1.40, totalRisk = $140 — and the planner says **FITS**.

The Today's Budget card currently shows values from engine #1 (`vaultState.daily_loss_limit` = $100). But the planner uses engine #2 ($150 risk budget). So the card says "$100 daily risk" and then the planner approves a $140 trade. That's confusing and contradictory.

## The Fix

**File: `src/pages/academy/AcademyTrade.tsx`** — lines 555-572 (Today's Budget section)

1. Import `detectTier`, `TIER_DEFAULTS` from `@/lib/tradePlannerCalc`
2. Derive budget from the **same engine the planner uses**:
   ```
   const tier = detectTier(vaultState.account_balance)
   const defaults = TIER_DEFAULTS[tier]
   const riskBudget = vaultState.account_balance * (defaults.riskPercent / 100)
   const comfortBudget = vaultState.account_balance * (defaults.preferredSpendPercent / 100)
   ```
3. Update the 3 columns to show:
   - **Risk Budget**: `riskBudget` — "Max you can lose today" (e.g. $150 for $15K)
   - **Comfort Spend**: `comfortBudget` — "Ideal position cost limit" (e.g. $750)
   - **Trades Allowed**: keep `vaultState.max_trades_per_day`
4. Add a 4th column: **Max Contracts** from `vaultState.max_contracts_allowed`
5. Add context line: `"$15,000 · Medium tier · 1% risk"` so the trader sees exactly why these numbers are what they are
6. Add a small note: `"The planner uses these same rules to size your trade"`

This makes the budget card **match the planner exactly** — same function, same percentages, same output. No more "$100 budget" contradicting a "$140 approved trade."

