

# Audit: VAULT OS Pipeline Integrity

## Issues Found

### 1. Cross-User Data Leak on Logout (BUG)
The `signOut()` function in `useAuth.tsx` clears 15 localStorage caches but **misses 5**:
- `va_cache_trade_entries` (trade journal — HIGH severity)
- `va_cache_student_access` (access status)
- `va_cache_ai_focus` (AI analysis)
- `va_cache_lesson_progress` (lesson tracking)
- `va_cache_hot_tickers` (ticker mentions)

If User A logs out and User B logs in on the same device, User B will briefly see User A's cached trade data, balance, and AI analysis until the fresh fetch completes. For a trading OS, this is a data integrity issue.

**Fix:** Add the 5 missing `localStorage.removeItem()` calls to `signOut()` in `src/hooks/useAuth.tsx`.

### 2. Pipeline Verification (All Good)
After reviewing the full codebase, the rest of the pipeline is sound:

- **Data persistence**: `trade_entries` and `approved_plans` both filter by `user_id` via RLS policies and client-side `.eq("user_id", user.id)` queries. Each user only sees their own data.
- **Balance tracking**: `profiles.account_balance` is the static starting point; live balance = `startingBalance + totalPnl` (sum of all trade P/L). This is consistent across VAULT Approval and My Trades.
- **Plan lifecycle**: `planned → logged/cancelled` state machine works. `plan_id` linkage from `trade_entries` to `approved_plans` correctly marks Planned vs Unplanned badges.
- **Vault state sync**: The `sync_trade_entry_to_vault_state` trigger automatically decrements risk remaining and updates loss streaks on every trade insert.
- **P/L calculation**: `risk_reward * risk_used` (where risk_reward is +1/-1/0) is consistent everywhere — useTradeLog, equity curve, HUD, MyTradesCard, journal entries.
- **Auto result type**: LogTradeSheet auto-sets Win/Loss from P/L sign, preventing contradictory entries.
- **R:R targets**: 1:1, 1:2, 1:3 calculated as `entry + (N * riskPerContract)` — mathematically correct.
- **Floating-point fix**: Already applied — `maxCutRoom` used directly instead of round-trip.
- **RLS**: Both `trade_entries` and `approved_plans` have proper user-scoped policies.
- **Export**: CSV export includes all fields correctly.

### 3. Minor: No Default Query Limit Safety
`useTradeLog` fetches all entries with no `.limit()`. For users with 1000+ trades, this will silently cap at 1000 rows (Supabase default). Not a bug yet but worth noting.

## Implementation Plan

**Single change in `src/hooks/useAuth.tsx`** — add 5 missing cache keys to the `signOut()` cleanup block (lines 194-210).

## Technical Details

Add after line 209:
```typescript
localStorage.removeItem("va_cache_trade_entries");
localStorage.removeItem("va_cache_student_access");
localStorage.removeItem("va_cache_ai_focus");
localStorage.removeItem("va_cache_lesson_progress");
localStorage.removeItem("va_cache_hot_tickers");
```

