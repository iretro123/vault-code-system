

## Plan: Pipeline Leak Fixes — COMPLETED

### What was fixed

**Leak 5 (Critical): Trade Log → Vault State Sync**
- Created DB trigger `sync_trade_entry_to_vault_state` that fires on `trade_entries` INSERT
- Decrements `trades_remaining_today`, reduces `risk_remaining_today`, updates `loss_streak`
- Escalates `vault_status` to YELLOW (2 consecutive losses) or RED (limits exhausted)
- Never downgrades from RED; persists block reason

**Leak 2 (High): Vault State Gate on Approval Page**
- `VaultTradePlanner` now imports `useVaultState` and checks status
- Shows warning banner when vault is RED or session is paused
- Disables "Use This Plan" button when blocked
- `HeroDecisionCard` receives `vaultBlocked` prop

**Leak 1 (Medium): Balance Drift Refetch**
- `VaultTradePlanner` calls `refetchTrades()` on mount via `useEffect`
- Ensures `totalPnl` is fresh when navigating from My Trades back to approval

**Leak 4 (Medium): Timezone-Safe Plan Expiry**
- `useApprovedPlans` now uses UTC date (`getUTCFullYear/Month/Date`) for the `created_at` filter
- Appends `Z` suffix to ensure consistent UTC comparison with server timestamps

**Leak 3 (Low): P/L Result Type Validation**
- `LogTradeSheet` auto-sets Win/Loss from calculated P/L sign via `useEffect`
- Positive P/L → Win, Negative P/L → Loss (user can still override manually)
