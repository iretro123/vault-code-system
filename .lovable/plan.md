

## Calendar Tab Redesign — Selection Screen + Dedicated Views

### Overview
Replace the current "dump everything" Calendar tab with a clean two-step flow:
1. **Selection screen** — two premium glass cards: "Earnings Calendar" and "Economic Calendar"
2. **Dedicated view** — only one feed at a time, with a back button to return

### Data Source Switch: Finnhub → FMP
Replace Finnhub with Financial Modeling Prep (FMP) for both earnings and economic calendar data. The edge function already handles refresh/cache — just swap the API endpoints.

**FMP endpoints:**
- Earnings: `https://financialmodelingprep.com/api/v3/earning_calendar?from=...&to=...&apikey=...`
- Economic: `https://financialmodelingprep.com/api/v3/economic_calendar?from=...&to=...&apikey=...`

### Step 0: Add FMP API Key
Request an `FMP_API_KEY` secret from the user (free tier available at financialmodelingprep.com).

### Step 1: Update Edge Function
**File:** `supabase/functions/economic-calendar/index.ts`

In `refresh` mode, swap Finnhub URLs for FMP URLs. Normalize FMP's response shape into the same `market_events` / `market_earnings` table schema. No table changes needed — same columns work.

FMP economic calendar returns: `event`, `date`, `country`, `actual`, `previous`, `consensus`, `impact` (Low/Medium/High).
FMP earnings returns: `symbol`, `date`, `time` (bmo/amc), `epsEstimated`, `revenueEstimated`, etc.

### Step 2: Rewrite UI Component
**File:** `src/components/academy/community/EconomicCalendarTab.tsx`

**State:** `view: "select" | "earnings" | "economic"` — starts at `"select"`.

**Selection Screen (view === "select"):**
- Two large glass cards centered vertically and horizontally
- Card 1: "Earnings Calendar" — icon (BarChart3), subtitle "This week's earnings reports"
- Card 2: "Economic Calendar" — icon (Calendar/Clock), subtitle "U.S. market-moving events"
- Cards: `bg-white/[0.03] border border-white/[0.06] rounded-2xl`, hover: `border-white/[0.12]` + subtle glow
- Clean centered layout with generous spacing

**Earnings View (view === "earnings"):**
- Back arrow + "Earnings This Week" header
- Clean list grouped by date with sticky date headers
- Each row: ticker (mono bold), date, BMO/AMC badge, EPS estimate, revenue estimate
- Soft separators (`border-white/[0.04]`), no heavy boxes
- Subtle beat/miss tinting when actuals available

**Economic View (view === "economic"):**
- Back arrow + "U.S. Economic Events — This Week" header
- Events grouped by date
- Each card: left impact bar (red/amber/muted), time ET in mono, event name, impact badge
- Prev / Forecast / Actual in clean columns
- High-impact events get subtle red glow
- Key events (FOMC, CPI, NFP, GDP) get slightly more visual weight

### Step 3: Hook stays the same
**File:** `src/hooks/useEconomicCalendar.ts` — no changes needed. It already queries both tables and provides `earningsByDate`, `todayEvents`, `thisWeekHighImpact`, etc.

### Files

| File | Action |
|------|--------|
| `supabase/functions/economic-calendar/index.ts` | Swap Finnhub → FMP API endpoints |
| `src/components/academy/community/EconomicCalendarTab.tsx` | Full rewrite with selection screen + two views |
| Secret: `FMP_API_KEY` | Request from user |

### Design Tokens
- Selection cards: `bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8`
- Hover: `border-white/[0.12] shadow-[0_0_30px_rgba(59,130,246,0.06)]`
- Back button: ghost style, `text-muted-foreground hover:text-foreground`
- Impact high: `bg-red-500` bar + `shadow-[0_0_20px_rgba(239,68,68,0.1)]`
- Earnings beat: `text-emerald-400`, miss: `text-red-400`
- Typography: mono for numbers/tickers/times, semibold for labels

