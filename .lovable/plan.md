

## Upgrade Calendar Tab — Premium Market Intelligence Cockpit

### What Changes

The existing Calendar tab gets a major upgrade: server-side data caching (no more live API calls per user), premium glass-card UI redesign, and curated market event sections focused on what traders actually need.

### Architecture Change

```text
Current:  User opens tab → Edge function → Finnhub API (every request)
New:      Cron job (every 6h) → Edge function → Finnhub → Supabase table
          User opens tab → Read from Supabase table (instant, cached)
```

### Step 1: Create `market_events` and `market_earnings` Tables

Two tables to cache normalized data server-side:

**`market_events`** — economic calendar events
- `id` (text PK), `date`, `time_et`, `country`, `event_name`, `impact` (high/medium/low), `actual`, `estimate`, `prev`, `unit`, `fetched_at`

**`market_earnings`** — earnings calendar
- `id` (text PK), `date`, `symbol`, `hour`, `eps_estimate`, `eps_actual`, `revenue_estimate`, `revenue_actual`, `quarter`, `year`, `fetched_at`

RLS: SELECT for authenticated users (read-only). No INSERT/UPDATE/DELETE from client.

### Step 2: Update Edge Function `economic-calendar`

Add two modes:
- **`?mode=refresh`** — called by cron, fetches Finnhub, upserts into tables, requires service role key
- **Default GET** — reads from Supabase tables (fast cached response), no Finnhub call

### Step 3: Schedule Cron Job

Use `pg_cron` + `pg_net` to call the edge function with `?mode=refresh` every 6 hours.

### Step 4: Update `useEconomicCalendar` Hook

Switch from calling the edge function to querying the Supabase tables directly via the JS client. Add client-side filtering for key event types (FOMC, CPI, PPI, NFP, GDP, unemployment, Fed).

### Step 5: Redesign `EconomicCalendarTab` UI

Full rewrite with premium Vault OS glass-card design. Four distinct sections:

**A. Next Major Event (Hero Card)**
- Full-width glass card with glowing border based on impact
- Large event name, countdown timer, date/time in ET
- Prev / Forecast / Actual columns
- Only shows FOMC, CPI, PPI, NFP, GDP, or unemployment events

**B. Today's U.S. Market Events**
- Stacked glass cards for each event happening today
- Left impact bar (red/amber/muted), time in ET, event name
- Clean 3-column data grid (Prev / Est / Act)
- Empty state: "No events scheduled today"

**C. This Week's High Impact Events**
- Date-grouped sections with sticky headers
- Only high-impact US events shown
- Same card style as Today section

**D. Upcoming Earnings**
- Date-grouped earnings with monospace ticker pills
- BMO/AMC timing badges
- EPS estimate + revenue columns
- Subtle beat/miss tinting when actuals available

**Design tokens:**
- Cards: `bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl`
- Section spacing: `space-y-6`, `px-5 py-4`
- Impact colors: red-500 (high), amber-400 (medium), muted (low)
- Typography: mono for numbers/times, semibold labels, bold section headers
- No tables — all card-based layout
- Mobile: single column stacked. Desktop: single column (it lives inside a tab panel)

### Files

| File | Action |
|------|--------|
| Migration | Create `market_events` + `market_earnings` tables with RLS |
| `supabase/functions/economic-calendar/index.ts` | Rewrite: add refresh mode + read-from-DB mode |
| `supabase/config.toml` | Add pg_cron/pg_net extension enablement if needed |
| `src/hooks/useEconomicCalendar.ts` | Rewrite: query Supabase tables directly |
| `src/components/academy/community/EconomicCalendarTab.tsx` | Full UI rewrite with glass-card premium design |
| pg_cron SQL (via insert tool) | Schedule 6-hour refresh job |

### What Stays the Same
- The "Calendar" tab position in the Community page
- The `AcademyCommunity.tsx` page structure — no changes needed
- Finnhub as data source (just cached server-side now)

