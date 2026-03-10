

## Fix Balance Tracking & Enhance AI Mentor Insights

### Problems Found

1. **Double-counting balance bug** (Critical): After logging a trade, `handleTradeSubmit` (lines 129-132) updates `profiles.account_balance` to the new tracked value. On next page load, `startingBalance` loads this updated value, but `totalPnl` still sums ALL trades — so the same P/L gets counted twice. Each trade compounds the error.

2. **WeeklyBalanceCheckCard also overwrites** `account_balance` (line 145), causing the same double-count issue — it replaces the starting balance with a new number but all historical trades still add up on top.

3. **Edge function auth bug**: `getClaims(token)` (line 33 of trade-focus) doesn't exist in the Supabase JS client. Will fail at runtime.

4. **AI mentor only returns 4 static fields** — no sizing/contract recommendations, no actionable "what to do next" insights about increasing size.

### Changes

**`supabase/functions/trade-focus/index.ts`**
- Replace `getClaims(token)` with `getUser()` for proper auth
- Expand the AI prompt to also return: `sizingAdvice` (whether they should scale up, stay flat, or reduce size based on recent performance) and `nextSessionTip` (a specific reminder for their next session)
- Add these two new fields to the tool schema

**`src/pages/academy/AcademyTrade.tsx`**
- **Remove lines 129-132** (the balance update after each trade). `account_balance` in profiles = starting balance ONLY, never changes from trade logging.
- **Remove WeeklyBalanceCheckCard entirely** — it creates confusion by overwriting the starting balance. Balance resets belong in settings only (via the existing RESET flow in TrackedBalanceCard).
- **Remove `handleBalanceSave`** and related state (`brokerBalance`, `balanceSaved`, `balanceCheckDismissed`).
- **Update AIFocusCard** to render the two new fields (`sizingAdvice`, `nextSessionTip`) with appropriate icons and styling — sizing advice gets a scaling icon, next session tip gets a lightbulb.
- Keep TrackedBalanceCard's reset flow as-is (it correctly resets to 0 and re-prompts for new starting balance).

**`src/hooks/useTradeLog.ts`** — No changes needed, computed metrics are correct.

### Balance Flow (After Fix)
```text
Student sets starting balance → saved to profiles.account_balance (ONE TIME)
Each trade logged → adds to trade_entries table only
trackedBalance = startingBalance + SUM(all trade P/L) ← always computed live
Reset balance → profiles.account_balance = 0 → re-prompt for new starting balance
```

### AI Mentor Output (Enhanced)
The edge function will return 6 fields instead of 4:
- `topMistake`, `focusRule`, `pattern`, `encouragement` (existing)
- `sizingAdvice` — "Your last 5 trades show consistent discipline. Consider adding 1 contract next session." or "Pull back to minimum size until you string 3 compliant trades."
- `nextSessionTip` — "Before your next trade, check if the setup matches your best-performing pattern (Breakout, 80% win rate)."

