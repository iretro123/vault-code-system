

# Trading OS — Premium Dashboard Redesign

Inspired by the reference image (Loud fintech dashboard), the Trading OS page will be restructured into a clean, organized dashboard layout with clear visual hierarchy — a welcome header with hero balance, then organized card grid sections below, all wrapped in the existing dark luxury aesthetic.

## Layout Restructure

### 1. Welcome Hero Section (replaces command bar)
A prominent header section inspired by the reference:
- Large **greeting + balance display**: "Your Trading Day" with the tracked balance as a hero number (`text-3xl font-bold`)
- **Change indicator pill**: Today's P/L as a colored badge next to the balance
- **Stage tabs** remain below as the iOS segmented control (unchanged `OSTabHeader`)

### 2. Hero OS Card — Cleaner Internal Spacing  
- Stage headlines stay but get slightly more breathing room
- The two-column layout (main + right rail) stays — it works
- Right rail gets a subtle section header "SESSION" label
- Intelligence strip at bottom gets a slight polish (rounded divider, smoother hover)

### 3. Lower Analytics — Card Grid Layout (inspired by reference)
Currently a stacked list. Restructure into a **proper dashboard grid** like the reference:
- **Row 1**: Equity Curve (span 2 cols) — already premium from last update
- **Row 2**: Performance Breakdown (1 col) + Recent Trades compact list (1 col)  
- **Row 3**: Tracked Balance (1 col) + Weekly Review (1 col)
- Each card gets consistent `rounded-2xl border border-white/[0.06] bg-card` styling
- Section label "Performance & History" → "Analytics" with a small icon

### 4. Performance Breakdown Card — Premium Upgrade
Currently has old `border-border/50` styling. Update to match the luxury standard:
- `rounded-2xl border border-white/[0.06] bg-card`
- Tab switcher → iOS segmented control style (matching the reference's clean tabs)
- Symbol rows get tighter spacing and cleaner bars

### 5. Recent Trades — Compact Table Style
Currently uses large cards with emoji badges. For the lower analytics section, add a **compact mode** — a clean transaction-list style (like "Recent transactions" in the reference):
- Simple rows: dot indicator, symbol, outcome, P/L amount
- Remove the emoji badges and large card padding in the analytics context
- Keep the full expanded view when user clicks "Show all"

### 6. Weekly Review + Tracked Balance — Consistent Card Styling
Apply `rounded-2xl border border-white/[0.06]` to match the grid aesthetic.

## Files Changed

1. **`src/pages/academy/AcademyTrade.tsx`**
   - Add welcome hero section above the OS card with balance + greeting
   - Restructure lower analytics into proper 2-col grid
   - Polish spacing and section labels

2. **`src/components/trade-os/PerformanceBreakdownCard.tsx`**
   - Update border/bg styling to match luxury standard
   - iOS segmented control for tab switcher
   - Tighter row spacing

3. **`src/components/trade-os/RecentTradesSection.tsx`**
   - Add compact transaction-list variant for the analytics grid
   - Clean row style: colored dot + symbol + outcome text + P/L right-aligned

4. **`src/components/trade-os/WeeklyReviewCard.tsx`**  
   - Update from `vault-glass-card` to `rounded-2xl border border-white/[0.06] bg-card`

5. **`src/components/trade-os/TrackedBalanceCard.tsx`**
   - Update from `vault-glass-card` to consistent card styling

## What Does NOT Change
- All data logic, hooks, backend queries
- OSTabHeader, OSControlRail, SessionSetupCard internals
- VaultTradePlanner, EquityCurveCard (already upgraded)
- AI Focus Card internals
- Modal/sheet components
- Mobile nav, sidebar, layout structure

