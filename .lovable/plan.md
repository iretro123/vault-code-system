

## Upgrade Economic Calendar — Scrape MarketWatch Instead of FearGreedMeter

### Problem
FearGreedMeter parsing is unreliable and missing most of this week's events. Forex Factory is fully JS-rendered and blocks scraping. We need a source that returns clean, structured data with times, forecasts, actuals, and previous values.

### Solution
**Switch to MarketWatch** (`marketwatch.com/economy-politics/calendar`). It returns a clean HTML table with:
- Time in ET (e.g. "8:30 am")
- Report name (e.g. "CPI year over year", "Initial jobless claims")
- Period (e.g. "March", "Q4")
- Actual value (filled after release)
- Median Forecast
- Previous value

This gives us 30+ events per week including Fed speakers, all the key releases (CPI, PPI, PCE, GDP, NFP, ISM, jobless claims, housing, consumer sentiment), and two weeks of forward-looking data.

### What Changes

**File: `supabase/functions/economic-calendar/index.ts`**

Replace the `parseFearGreedMeterEvents` scraping block with:
1. Fetch `https://www.marketwatch.com/economy-politics/calendar` as HTML/text
2. Parse the markdown-style table rows — MarketWatch returns clean table structure
3. Extract date headers (e.g. "MONDAY, APRIL 6"), time ET, report name, period, actual, forecast, previous
4. Normalize into existing `market_events` table columns: `id`, `date`, `time_et`, `country`, `event_name`, `impact`, `actual`, `estimate`, `prev`, `unit`
5. Classify impact using existing keyword logic (FOMC/CPI/NFP/GDP = high, PPI/PMI/housing = medium, etc.)
6. Parse numeric values from strings like "55.4%", "$10.0 billion", "202,000"

Remove all `parseFearGreedMeterEvents`, `isLikelyEventName`, `extractTimeFromNearbyLines` helper functions — replaced by cleaner MarketWatch parsing.

Keep Finnhub for earnings (already working with 418 records).

### Data Quality Improvement

| Field | FearGreedMeter | MarketWatch |
|-------|---------------|-------------|
| Time ET | Unreliable extraction | Clean "8:30 am" format |
| Forecast | Not available | Median forecast included |
| Previous | Not available | Previous value included |
| Actual | Not available | Filled after release |
| Period | Not available | "March", "Q4", etc. |
| Fed speakers | Missing | Included with times |
| Coverage | ~10-15 events | 30+ events per week |

### Files

| File | Action |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Replace FearGreedMeter scraping with MarketWatch parsing |

No new tables, no new secrets, no UI changes. The `useEconomicCalendar` hook and `EconomicCalendarTab` component already render whatever is in `market_events` — they'll now show richer data with forecasts, actuals, and previous values.

