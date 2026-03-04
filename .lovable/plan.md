

## Make My Trades Beginner-Friendly with Empty State + Dismissable Balance Modal

**Goal:** Remove fake stats, let users dismiss the balance modal, and show a clear guided empty state that tells new users exactly what to do step by step.

### Changes

**1. `SetStartingBalanceModal.tsx` — Make dismissable**
- Add `onDismiss` prop alongside `onSave`
- Allow closing via X button (remove `onPointerDownOutside` prevention)
- Add a "Skip for now" text button below "Save Starting Balance"

**2. `AcademyTrade.tsx` — Major rework for empty/new-user state**

**Remove fake data:**
- Change `INITIAL_TRADES` to an empty array `[]`
- Remove hardcoded stats from `WeeklyProgressCard` — show "--" or "0" placeholders
- `TrackedBalanceCard` already handles `null` state

**Add `balanceSkipped` state** (boolean) — tracks if user dismissed the modal without saving. When `startingBalance === null && balanceSkipped === true`, the page is visible but shows a persistent inline reminder banner.

**New: Getting Started Banner** (shows when `startingBalance === null && trades.length === 0`)
A prominent card at the top of the page content with:
- Title: "Get Started with My Trades"
- Three numbered steps, large and clear:
  1. **Set your starting balance** — "Tell us your current account balance so we can track your progress." + button "Set Starting Balance" (reopens modal)
  2. **Log your first trade** — "After your next trade, tap the + Log Trade button above." (dimmed if step 1 not done)
  3. **Complete your check-in** — "After logging, you'll answer 3 quick questions. Takes 30 seconds." (dimmed)
- Visual: numbered circles with active/dimmed states, step 1 highlighted with a subtle pulse/ring if balance not set

**Inline reminder banner** (shows when `balanceSkipped === true && startingBalance === null`):
- Small amber card: "You skipped setting your starting balance. Your stats won't track accurately until you do."
- Button: "Set Balance Now"

**Update sub-components:**
- `WeeklyProgressCard` accepts `hasData` prop — when false, shows "0" for all stats with helper text "Log your first trade to see stats here."
- `RecentTradesSection` — when `trades.length === 0`, shows empty state: "No trades logged yet. Use the + Log Trade button to get started."
- `AIFocusCard` — when no trades, shows: "Log at least 3 trades to unlock AI insights."
- `WeeklyReviewCard` — when no trades, button disabled with text "Need at least 1 week of trades."

**Files changed:** `SetStartingBalanceModal.tsx`, `AcademyTrade.tsx` (2 files, no new files)

