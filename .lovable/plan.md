

## Rebuild Trade Page as "My Trades" — UI Shell with Mock Data

**One file changed:** `src/pages/academy/AcademyTrade.tsx` — full rewrite of the page content.

### What changes

Replace the entire `AcademyTrade` component contents (tabs, PostTradeForm, CoachFeedbackQueue) with a new card-based layout using static mock data. No backend logic, no modals, no forms wired up.

### Layout structure

```text
PageHeader: "My Trades" + subtitle + "+ Log Trade" button (top-right)

Content area (max-w-3xl, stacked cards):

1. Today's Trade Check card
   - Status: Incomplete, 0 trades, check-in not started
   - Two buttons: "Log today's trade" (primary), "Mark no-trade day" (outline)

2. Weekly Progress card
   - 2x2 stat grid: Trades Logged (8), Win Rate (62%), P/L (+$438), Plan Follow Rate (78%)

3. Tracked Balance card
   - Main: $3,142 | Today: +$86 | This Week: +$438

4. AI Focus for Next Trade card
   - Top mistake + focus rule + "Seen in 3 of last 7" + "View reviewed trades" link

5. Recent Trades section
   - 3 mock trade rows (SPY win, TSLA loss, NVDA breakeven) with colored chips
   - "View all trades" footer link

6. Weekly Review card
   - Status: Ready | "Generate Weekly Review" button

7. Weekly Balance Check card
   - Mock number input with placeholder $____
   - "Save Balance" + "Skip for now" buttons
```

### Styling approach
- Reuse existing `vault-glass-card` class and Card component
- Emerald for wins/positive, red for losses, amber for breakeven
- Chips as small rounded-full badges
- All responsive — stacked on mobile, readable width on desktop
- Dark theme consistent with existing app

### What is NOT changed
- No sidebar/nav changes
- No backend/database calls
- No real state management
- No modal implementations
- PremiumGate check stays intact

