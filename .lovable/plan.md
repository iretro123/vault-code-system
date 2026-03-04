

## Add V1 Accountability Flows to My Trades

**4 files total:** 3 new components + edit `AcademyTrade.tsx`.

### New components

**1. `src/components/academy/SetStartingBalanceModal.tsx`**
- Dialog with "Set Starting Balance" title, copy explaining purpose, dollar input (required), date picker (defaults today), "Save Starting Balance" button.
- Props: `open`, `onSave(balance: number)`.

**2. `src/components/academy/QuickCheckInSheet.tsx`**
- Sheet that opens after trade submit. Title: "Trade Check-In (30 sec)".
- Three small textareas: "What did you do well?", "What hurt this trade most?", "Next trade focus (one thing)".
- "Complete Check-In" button. Props: `open`, `onOpenChange`, `onComplete()`.

**3. `src/components/academy/NoTradeDaySheet.tsx`**
- Sheet triggered by "Mark no-trade day". Title: "Mark No-Trade Day".
- Pill-button selector for reason (No A+ setup, Busy/work, Risk limit hit, Market unclear, Discipline day, Other).
- Optional note textarea. "Mark No-Trade Day" button.
- Props: `open`, `onOpenChange`, `onComplete()`.

### Edits to `AcademyTrade.tsx`

Add local state:
- `startingBalance: number | null` (null = show setup modal)
- `trackedBalance: number` (starting + sum of trade P/Ls)
- `todayStatus: "incomplete" | "in_progress" | "complete"`
- `showCheckIn`, `showNoTradeDay`, `balanceCheckDismissed`, `balanceSaved` booleans
- `brokerBalance: string` for weekly check input

Flow wiring:
- Render `SetStartingBalanceModal` when `startingBalance === null`. On save, set both `startingBalance` and `trackedBalance`.
- After `handleTradeSubmit`: set `todayStatus = "in_progress"`, open `QuickCheckInSheet`.
- On check-in complete: set `todayStatus = "complete"`, toast success.
- Wire "Mark no-trade day" to open `NoTradeDaySheet`. On complete: set `todayStatus = "complete"`.
- Update `TodayTradeCheckCard` to accept `todayStatus` and render three states with appropriate badges, stat values, and CTAs.
- Update `TrackedBalanceCard` to accept `balance` prop.
- Update `WeeklyBalanceCheckCard` to accept `onSave`, `onSkip`, `saved` props. On save: toast + green confirmation text. On skip: hide card.

