

## Build Log Trade Modal/Sheet

**Two files changed:** Create `src/components/academy/LogTradeSheet.tsx` (new), edit `src/pages/academy/AcademyTrade.tsx`.

### New component: `LogTradeSheet.tsx`

A right-side Sheet (mobile-friendly slide-in) containing the trade logging form.

**Form fields (top to bottom):**
1. **Symbol** — text input, uppercase
2. **Direction** — segmented toggle: Calls / Puts
3. **Date/Time** — date picker defaulting to now (using Popover + Calendar from shadcn)
4. **Entry Price** — number input
5. **Exit Price** — number input
6. **Position Size** — number input
7. **Result Type** — segmented toggle: Win / Loss / Breakeven
8. **P/L ($)** — auto-calculated from entry/exit/size, editable override
9. **Accountability section** (Yes/No toggles):
   - Did you hit your target? (Yes / Partial / No)
   - Did you respect your stop? (Yes / No)
   - Did you follow your plan? (Yes / No)
   - Did you oversize? (Yes / No)
10. **Setup Used** — Select dropdown (mock options: Breakout, Supply/Demand, Trend Follow, Scalp, Other)
11. **Screenshot** — file input UI placeholder (no upload logic)
12. **Quick Note** — optional textarea

**Footer:** "Save Trade & Generate Review" (primary) + "Cancel" (ghost). Uses Sheet's sticky footer pattern.

**Props:** `open`, `onOpenChange`, `onSubmit(trade)` — controlled by parent.

### Edit: `AcademyTrade.tsx`

- Add `useState` for `showLogTrade` boolean and `trades` array (initialized with existing `MOCK_TRADES`).
- Add `todayTradeCount` derived from trades state.
- Wire both "+ Log Trade" buttons to `setShowLogTrade(true)`.
- Pass state down to child cards via props (TodayTradeCheckCard gets `count` + `onLogTrade`).
- On form submit: append new trade to `trades`, update today count, show toast, close sheet.
- Today's Trade Check card updates status badge: 0 trades = "Incomplete", 1+ = "In progress".
- Render `<LogTradeSheet>` at bottom of component tree.

### Styling
- Reuse existing `vault-glass-card` patterns, dark theme inputs
- Segmented toggles as inline button groups with active state highlight
- Sheet width: `sm:max-w-lg` for comfortable form reading
- ScrollArea inside sheet content for long form on mobile

