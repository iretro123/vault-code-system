
Goal: Fix the “Error logging trade” issue in /academy/trade and make trade logs reliably persist + sync balance.

1) Confirmed root causes from current code + DB
- `trade_entries` has restrictive constraints that clash with current UI payload:
  - `risk_reward >= 0` (but code sends `-1` for losses)
  - `risk_used <= 100` (but code uses absolute P/L, often >100)
- A blocking DB trigger exists on `trade_entries`:
  - `enforce_trade_permission_trigger` calls `get_vault_execution_permission(...)`
  - This can reject journal-style logs when Vault gate conditions aren’t open.
- UX issue: `LogTradeSheet` resets immediately before async submit succeeds, so users lose input even when insert fails.

2) Database fixes (migration)
- Remove Vault execution enforcement from `trade_entries` inserts (journal logging should not be blocked by execution gate):
  - `DROP TRIGGER IF EXISTS enforce_trade_permission_trigger ON public.trade_entries;`
  - keep function only if referenced elsewhere, otherwise drop it too.
- Relax `trade_entries` constraints to match actual app behavior:
  - Drop current `trade_entries_risk_reward_check` and recreate to allow negative/positive values.
  - Drop current `trade_entries_risk_used_check` and recreate as non-negative only (remove upper cap 100).
- Keep RLS as-is (`auth.uid() = user_id`) so users still only write/read their own logs.

3) Frontend payload + sync corrections
- `src/pages/academy/AcademyTrade.tsx`
  - Keep using result type to set sign, but store complete trade metadata in DB insert:
    - `trade_date` from selected date
    - `symbol`, `outcome` (`WIN/LOSS/BREAKEVEN`), `instrument_type` (options/futures default logic)
    - richer `notes` including setup + accountability fields
  - Fix balance/stat math so `followed_rules` does not invert P/L sign.
- `src/hooks/useTradeLog.ts`
  - Remove unnecessary `as any` now that `trade_entries` exists in generated types.
  - Return surfaced DB error message in toast (instead of generic “Please try again”) for actionable debugging.
- `src/components/academy/LogTradeSheet.tsx`
  - Make submit flow await parent result and only reset/close on success.
  - Keep form filled if save fails.

4) Validation and backward compatibility
- Keep existing rows valid after constraint change (no destructive schema changes).
- No auth flow changes needed; existing authenticated/RLS model remains correct.
- Verify CSV export and weekly cards still compute correctly after sign logic fix.

5) Verification checklist after implementation
- Log a Win, Loss, and Breakeven from /academy/trade.
- Confirm each insert appears in `trade_entries` immediately.
- Confirm profile `account_balance` updates correctly for all outcomes.
- Confirm failed insert (forced invalid case) preserves form inputs and shows precise error.
- Confirm My Trades history + CSV export still work.
