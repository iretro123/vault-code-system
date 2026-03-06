

## Make Trade Log Fully Persistent + Mobile-Optimized History

### What this plan does
- Ensures every trade logged is saved permanently (no fetch limits, no individual delete)
- Shows 15 most recent trades on mobile, full expandable history on desktop
- Adds CSV export for all trades
- Adds "Delete Journal & Progress" option in Settings > Privacy
- Does NOT change any existing My Trades logic, metrics, or UI cards

### Changes

**1. `src/hooks/useTradeLog.ts`**
- Remove `.limit(50)` from the fetch query so all trades load
- Remove the `deleteEntry` function entirely (trades are immutable)
- Add an `exportCSV()` helper that downloads all entries as a `.csv` file

**2. `src/pages/academy/AcademyTrade.tsx` — RecentTradesSection only**
- Default display: 15 trades (works well on mobile without destroying layout)
- Add "Show all trades" toggle that expands the full list (desktop users)
- Add small "Export CSV" button at the bottom of the trades list
- No changes to any other cards, metrics, handlers, or logic

**3. `src/components/settings/SettingsPrivacy.tsx`**
- Add a "Delete Journal & Progress" destructive action
- Protected by a type-"DELETE" confirmation gate (same pattern as balance RESET)
- Deletes all `trade_entries` and `journal_entries` for the user, resets `account_balance` to 0
- Clear warning copy about permanence

### What stays the same (untouched)
- All dashboard cards, metrics, balance tracking, check-in flow
- LogTradeSheet form and submission handler
- Weekly progress, AI focus, weekly review cards
- All existing computed metrics (winRate, P/L, trackedBalance)
- MyTradesCard on dashboard

