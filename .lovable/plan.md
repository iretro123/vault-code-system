

## Add "Calendar" Tab — Robinhood-Style Economic & Earnings Feed

### Overview
A new "Calendar" tab next to Wins in the Community page. Premium iOS/Robinhood-inspired design — clean cards, high-contrast typography, color-coded impact levels, sticky daily habit creator. Data fetched live from Finnhub (free API).

### What's Needed First
**Finnhub API key** (free) — sign up at [finnhub.io](https://finnhub.io), grab the free key from your dashboard. I'll prompt you to add it as a secret before building.

### Architecture

```text
Community Tabs:  Chat | Signals | Wins | Calendar
                                          ↓
                            EconomicCalendarTab.tsx
                                    ↓
                          useEconomicCalendar.ts
                                    ↓
                    Edge Function: economic-calendar
                                    ↓
                          Finnhub API (free tier)
```

### Design Vision — Robinhood/iOS Native Feel

- **Sticky date header** — "Monday, Apr 7" pinned at top, scrolls with content
- **Time-grouped sections** — "Pre-Market · 8:30 AM", "Market Open · 9:30 AM" — Robinhood-style time dividers
- **Event cards** — Full-width rows, left color bar (red = high impact, amber = medium, muted = low), clean mono values for Previous/Forecast/Actual
- **Earnings section** — Ticker pills in monospace font, EPS estimates, "Before Open" / "After Close" badges
- **This Week timeline** — Horizontal scrollable day pills (Mon–Fri) with dot indicators for event density
- **Empty state** — "Markets are quiet today" with next event countdown
- **Pull-to-refresh** with subtle haptic-style animation
- **Skeleton loading** — Robinhood shimmer placeholders

### Implementation Steps

1. **Add `FINNHUB_API_KEY` secret** — prompt user via secrets tool
2. **Create edge function** `supabase/functions/economic-calendar/index.ts` — fetches `/calendar/economic` + `/calendar/earnings` from Finnhub, returns combined sorted data with CORS
3. **Create hook** `src/hooks/useEconomicCalendar.ts` — React Query, 30min stale time, buckets data into Today/This Week/Earnings
4. **Build component** `src/components/academy/community/EconomicCalendarTab.tsx` — the full Robinhood-style feed with all sections described above
5. **Wire into Community** `src/pages/academy/AcademyCommunity.tsx` — add "Calendar" tab to TABS array, render component in tab content

### Files

| File | Action |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Create |
| `src/hooks/useEconomicCalendar.ts` | Create |
| `src/components/academy/community/EconomicCalendarTab.tsx` | Create |
| `src/pages/academy/AcademyCommunity.tsx` | Modify — add 4th tab |

### Why This Is Sticky
- Students open this every morning before trading — builds daily habit
- High-impact event alerts create urgency ("CPI drops in 2h")
- Earnings section helps them avoid surprise moves
- No other trading education platform embeds this directly in the community — differentiator

