

## Plan: Sync Delete Trade Across All Systems — COMPLETED

### What was implemented

**DB Trigger: reverse_trade_entry_from_vault_state**
- Fires AFTER DELETE on `trade_entries` for same-day trades
- Restores `trades_remaining_today` and `risk_remaining_today` (capped at max)
- Recalculates `loss_streak` from remaining trades
- Recalculates `vault_status` (GREEN/YELLOW/RED) — unlike INSERT trigger, DELETE CAN downgrade from RED
- Clears `last_block_reason` when reverting to GREEN
- Reverts linked `approved_plans` from `'logged'` → `'planned'`

**Frontend: AcademyTrade.tsx**
- After successful delete, calls `refetchPlan()` to refresh active plan state
- Vault state auto-updates via existing realtime subscription on `vault_state` table
- All computed metrics (win rate, P/L, equity curve, streaks) recalculate via `useMemo`
