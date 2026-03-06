

## Persist Account Balance and Trade Data Per User

### Current Problem
- `AcademyTrade.tsx` stores everything in local React state (`useState`). Balance and trades reset on every page load/navigation/logout.
- `MyTradesCard` on the dashboard hardcodes `balanceSet = false` and `tradesThisWeek = 0`.
- The database already has: `profiles.account_balance`, `trade_entries` table, `set_account_balance` RPC, and `useTradeLog` hook — none of which are wired into the Trade page.

### Solution

#### 1. `src/pages/academy/AcademyTrade.tsx` — Wire to database

**Balance persistence:**
- On mount, read `profiles.account_balance` for the current user
- If `account_balance > 0`, set `startingBalance` from DB, skip the modal
- When saving via `SetStartingBalanceModal`, call `supabase.from("profiles").update({ account_balance })` to persist
- Add a "Reset Balance" button that requires typing `RESET` to confirm before allowing a new balance

**Trade persistence:**
- Replace the local `trades` array with `useTradeLog()` hook (already exists, reads from `trade_entries` table)
- On `handleTradeSubmit`, call `useTradeLog().addEntry()` to insert into `trade_entries` with the form data mapped to DB columns (`symbol`, `outcome`, `risk_used`, `followed_rules`, etc.)
- Compute `trackedBalance` as `startingBalance + sum(trade P/L)` from DB entries
- Derive `tradesThisWeek`, `winRate`, `todayTradeCount` from `useTradeLog().entries`

**Reset gate:**
- Below the tracked balance card, add a small "Reset Balance" text button
- Clicking opens an inline confirmation: input field requiring the user to type `RESET`
- On confirmation, update `profiles.account_balance = 0` and clear the local state so the modal reappears

#### 2. `src/components/academy/dashboard/MyTradesCard.tsx` — Read real data

- Fetch `profiles.account_balance` and `trade_entries` (this week) for the current user
- Compute real values for `balanceSet`, `tradesThisWeek`, `winRate`, `pnl`, `todayTrades`
- Display the real tracked balance amount

#### 3. `src/components/academy/SetStartingBalanceModal.tsx` — Minor tweak

- Accept an optional `onSaveAsync` callback that returns a Promise, so the parent can await the DB write and show a loading state on the save button

### Technical Details

**Balance flow:**
```
Mount → fetch profiles.account_balance
  → if > 0: skip modal, show balance
  → if 0: show SetStartingBalanceModal
Save → update profiles.account_balance → refetch profile
Reset → type "RESET" → update profiles.account_balance to 0 → show modal again
```

**Trade metrics derivation (from `trade_entries`):**
```
trackedBalance = startingBalance + sum(entries.map(e => e.risk_reward * (e.outcome === 'win' ? 1 : -1) * e.risk_used))
tradesThisWeek = entries filtered to current week
winRate = wins / total * 100
todayTrades = entries filtered to today
```

No database migrations needed — all tables and RPCs already exist.

### Files to modify
| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Load balance from DB, persist trades via `useTradeLog`, add RESET gate |
| `src/components/academy/dashboard/MyTradesCard.tsx` | Fetch real balance + trade stats from DB |
| `src/components/academy/SetStartingBalanceModal.tsx` | Add loading state support for async save |

