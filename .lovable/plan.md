

## Fix Balance Update Pipeline — Full Data Sync

### Problem
The "Update" button on the hero risk card saves the new balance to `profiles.account_balance` and updates local state, but:
1. The `vault_state` row for today still has the **old** balance — vault limits, risk budgets, max contracts all stay stale
2. The VaultStateContext is never refreshed after a balance update
3. The tracked balance formula works locally but vault enforcement (trade permissions, risk limits) uses the stale DB value

### Root Cause
`get_or_create_vault_state` only reads `profiles.account_balance` when **creating** a new day's row. Once today's row exists, changing the profile balance has zero effect on vault enforcement.

### Fix — `AcademyTrade.tsx` → `handleStartingBalanceSave`

**After** the `profiles.update()` succeeds, add two steps:
1. **Update today's vault_state row** with the new balance and recalculated limits (daily_loss_limit, risk_remaining_today, max_contracts_allowed) using the same tier/risk logic the RPC uses
2. **Call `vaultRefetch()`** to refresh VaultStateContext so all downstream components (VaultCommandBar, VaultHUD, etc.) reflect the new balance immediately
3. **Call `refetchTrades()` and `refetchAdjustments()`** to ensure tracked balance recalculates cleanly

This requires:
- Destructuring `refetch` from `useVaultState()` (already available as `state` is used)
- After `supabase.from("profiles").update(...)`, add `supabase.from("vault_state").update({ account_balance: balance, daily_loss_limit, risk_remaining_today, max_contracts_allowed }).eq("user_id", user.id).eq("date", todayStr)`
- Then call `vaultRefetch()`, `refetchTrades()`, `refetchAdjustments()`

The vault_state update will use the same `computeVaultLimits` function (already imported) to calculate the correct limits from the new balance, keeping the logic DRY.

### Also fix: `handleResetBalance`
Same problem — reset zeroes profiles but leaves vault_state stale. Add vault_state update + refetch after reset.

| File | Change |
|------|--------|
| `AcademyTrade.tsx` | Add vault_state DB update + refetch cascade in both `handleStartingBalanceSave` and `handleResetBalance` |

