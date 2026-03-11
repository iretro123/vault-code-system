

# Sync Delete Trade Across All Systems

## Problem
The DB trigger `sync_trade_entry_to_vault_state` only fires on INSERT. When a trade is deleted, vault_state (trades remaining, risk remaining, loss streak, status) doesn't reverse. Also, if the deleted trade was linked to an approved plan (`plan_id`), that plan stays in "logged" status instead of reverting.

## Plan

### 1. Database: Add DELETE trigger to reverse vault_state
Create a new migration with a trigger function on `trade_entries` DELETE that:
- Increments `trades_remaining_today` by 1
- Adds back `risk_used` to `risk_remaining_today`
- Recalculates `loss_streak` from remaining today's trades
- Recalculates `vault_status` (GREEN/YELLOW/RED) based on new values
- Only affects today's vault_state row (same-day trades)

### 2. Database: Add DELETE trigger to revert approved_plan status
In the same migration, add logic: if the deleted trade had a `plan_id`, update `approved_plans` set `status = 'planned'` where `id = plan_id` and `status = 'logged'`.

### 3. `useTradeLog.ts` — After successful delete, trigger connected refetches
The `deleteEntry` function currently updates local state and cache. It needs to also signal that external systems should refresh. Add an optional `onAfterDelete` callback parameter or return a signal so the parent can refetch vault state and approved plans.

### 4. `AcademyTrade.tsx` — Wire up refetches after delete
After `onDelete` completes successfully:
- Call `refetchPlan()` (from `useApprovedPlans`) to refresh active plan state
- The vault state auto-updates via the realtime subscription on `vault_state` table (already wired in `VaultStateContext`)
- All computed metrics (win rate, P/L, equity curve, streaks) already recalculate via `useMemo` when entries change

### 5. `MyTradesCard` — Already reactive
Uses `useTradeLog()` which shares the same hook instance pattern — entries update flows through.

## Result
Deleting a trade will: reverse vault limits, revert linked plan to "planned", update all metrics, and reflect across VAULT Approval, My Trades dashboard card, and the Trading Command Center.

