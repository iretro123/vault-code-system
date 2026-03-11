

# 5 Potential Struggles & Leaks in the VAULT Approval → My Trades Pipeline

After deep-diving the full codebase — from approval calc, to plan persistence, to trade logging, to P/L tracking — here are 5 real problems a member will hit.

---

## Leak 1: Balance Drift Between Approval and My Trades

**The problem**: Both `VaultTradePlanner` and `AcademyTrade` independently fetch `profiles.account_balance` and add `totalPnl` to compute `trackedBalance`. But they each instantiate their own `useTradeLog()`, which means if a member logs a trade on the My Trades page, then navigates back to VAULT Approval, the approval page may still show a stale `totalPnl` from its own hook instance until a full remount. This means the approval math could be calculated against a **wrong account balance** — approving a size that no longer fits.

**Fix**: Either lift `totalPnl` into a shared context, or force `useTradeLog` to refetch on mount. A lightweight fix is adding a `refetch` call in `VaultTradePlanner`'s `useEffect` on mount.

---

## Leak 2: Approved Plan Has No Vault State Gate

**The problem**: The VAULT Approval page checks `hasAccess` (subscription) but does **not** check `vault_state` (session active, not RED, trades remaining). A member whose vault is RED or session is paused can still approve a plan and save it to the database. The execution gate (`PreTradeExecutionGateV2`, `VaultHUD`) blocks actual trading, but the approval page happily lets them build and save plans they can never act on — creating confusion.

**Fix**: Add a read-only vault status indicator on the approval page, or disable the "Use This" button when vault status is RED / session paused. This keeps the approval page informational but prevents saving plans that are immediately blocked.

---

## Leak 3: P/L Model Loses Precision on Partial Exits / Scaling

**The problem**: The trade log uses `risk_reward` as a simple +1/-1/0 multiplier times `risk_used` (absolute P/L). This works for clean wins/losses, but **breaks for partial exits**. If a member exits half at TP1 and half at TP2, they can't represent that as a single entry. They'd need to log two separate trades, which then counts as 2 trades against their compliance stats, inflating trade count and potentially distorting win rate.

There's also no validation that `pnl` matches the calculated `(exit - entry) * contracts * 100`. The member can override P/L with any number, and the system will accept it — the `risk_reward` is derived from `resultType` (Win/Loss/Breakeven), not from the actual P/L sign. A member could select "Win" but enter a negative P/L, creating contradictory data.

**Fix**: 
- Validate that `resultType` matches the sign of `pnl` (auto-set result from P/L sign, or warn on mismatch)
- Consider adding a "partial exit" option that splits into sub-entries linked to the same plan

---

## Leak 4: Stale Plan Persists Across Days

**The problem**: `useApprovedPlans` fetches plans where `status = 'planned'` and `created_at >= today`. But "today" is calculated client-side using `new Date().toISOString().slice(0, 10)`. If a member approves a plan at 11:50 PM ET but their browser is in a different timezone (e.g., PST where it's still 8:50 PM), the plan's `created_at` is stored in UTC. The next morning, the `.gte("created_at", todayStr + "T00:00:00")` filter uses the **client's local midnight**, not UTC midnight. This can cause:

- Plans from "yesterday" (UTC) appearing as today's plan, or
- Plans created late at night disappearing early the next morning

A member could also forget to cancel a plan, leave it overnight, and the next day it silently vanishes — they think they have no plan but never consciously decided that.

**Fix**: Normalize the date filter to use a consistent timezone (either always UTC, or the user's configured timezone). Consider also showing "Plan expired" messaging instead of silently dropping old plans.

---

## Leak 5: No Feedback Loop Between Trade Result and Vault State

**The problem**: When a member logs a trade on the My Trades page, it inserts into `trade_entries` and marks the plan as `logged`. But **nothing updates `vault_state`**. The vault's `trades_remaining_today`, `risk_remaining_today`, `loss_streak`, and `vault_status` are completely disconnected from trade logging. This means:

- A member can log 10 losses on My Trades and the vault still shows GREEN with 3 trades remaining
- The `risk_remaining_today` never decreases based on logged trades
- The `loss_streak` counter is never incremented
- The vault status never escalates to YELLOW or RED based on actual performance

The vault state is only modified through `trade_intents` (the Buying Now → Close Trade flow on the Cockpit), which is a completely separate path. Members using VAULT Approval → Log Trade are essentially **bypassing all enforcement**.

**Fix**: This is the biggest structural gap. Options:
1. Add a trigger/function that updates `vault_state` when a `trade_entry` is inserted (decrement trades remaining, add risk used, check loss streak)
2. Or treat `trade_entries` logging as the authoritative source and compute vault limits dynamically from today's entries instead of storing them as mutable state
3. At minimum, show a warning on the vault if logged trades exceed what the vault thinks happened

---

## Summary Priority

| # | Leak | Severity | Effort |
|---|------|----------|--------|
| 5 | No feedback loop to vault_state | Critical | Medium |
| 2 | No vault gate on approval page | High | Low |
| 1 | Balance drift between pages | Medium | Low |
| 4 | Timezone-dependent plan expiry | Medium | Low |
| 3 | P/L model loses partial exits | Low | Medium |

Leak 5 is the most dangerous — it means the entire enforcement system can be silently bypassed. Leak 2 is the quickest win. Want me to start fixing these?

