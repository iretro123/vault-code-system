

# Show All Trades + Remove AI Insights Gate

## Two Problems to Fix

1. **AI Performance Intelligence** shows "Log X more trades to unlock" when `primaryLeakConfidence === "insufficient"` (line 238-242 of `AIFocusCard.tsx`). This gates the actual insights behind a milestone wall. The AI edge function already generates real analysis text even at low counts — the UI just blocks it.

2. **Trade Journal** (RecentTradesSection) only shows 15 trades on mobile / 25 on desktop, with a "Show all" toggle. User wants ALL trades visible, organized by date with weekly grouping.

## Changes

### 1. `src/components/trade-os/AIFocusCard.tsx` — Remove the insufficient gate
- Delete lines 238-242: the `if (isInsufficient)` block that redirects to `InsufficientDataCard`
- Always render the full carousel (Primary Leak, Strongest Edge, Next Action, Progress) regardless of confidence level
- Keep the confidence badge label ("NEEDS MORE DATA" / "EMERGING PATTERN" / "HIGH CONFIDENCE") as informational — not blocking
- Keep the `InsufficientDataCard` function in the file (dead code is harmless), or remove it for cleanliness

### 2. `src/components/trade-os/RecentTradesSection.tsx` — Luxury trade journal with date grouping
- Remove the 15/25 limit and "Show all" toggle — show ALL trades, always
- Group trades by week with date separators (e.g., "This Week", "Mar 3 – Mar 7", "Feb 24 – Feb 28")
- Each week section is collapsible (older weeks start collapsed, current week open)
- Add a running P/L subtotal per week section
- Keep the existing trade card design (it's already premium)
- Keep Export CSV and delete functionality intact

### 3. `src/hooks/useTradeLog.ts` — No changes needed
The hook already fetches all trades without a `.limit()` call, so all data is available.

