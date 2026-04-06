

## Fix Economic Calendar — Scrape feargreedmeter.com for US Events

### Problem
FMP's economic calendar endpoint requires a paid tier — returns 0 events on free plan. Earnings (Finnhub) work fine with 418 records. We need a free source for economic events.

### Solution
Scrape **feargreedmeter.com/events** directly from the edge function. It's a public page with a clean structure containing exactly the events traders care about: CPI, FOMC, GDP, NFP, employment reports — with dates and times in ET.

No new API key needed. No new connector. Just fetch the HTML and parse it.

### What Changes

**File: `supabase/functions/economic-calendar/index.ts`**

Replace the FMP economic calendar section with:
1. Fetch `https://feargreedmeter.com/events` HTML
2. Parse event blocks using regex (each event has a date line, event name, and description with time)
3. Classify impact level based on event name (FOMC/CPI/NFP/GDP = high, Employment/PPI = medium, others = low)
4. Extract time from description text (e.g., "08:30 AM Eastern Time")
5. Normalize into the existing `market_events` table schema
6. Remove the `fmpKey` dependency for economic events

The parsing logic maps each event block to:
- `date` — from the date header (e.g., "Thu · Apr 09, 2026")
- `event_name` — the title (e.g., "CPI (Inflation) Report")
- `time_et` — extracted from description (e.g., "08:30")
- `impact` — classified by keyword matching
- `country` — always "US"

Keep Finnhub for earnings (already working). Keep FMP key in env for future use if needed.

### Files

| File | Action |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Replace FMP economic section with feargreedmeter scraping |

No new tables, no new secrets, no UI changes needed. The `useEconomicCalendar` hook and `EconomicCalendarTab` component already render whatever is in `market_events`.

