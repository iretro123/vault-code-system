

## Redesign Calendar Tab — Premium Earnings Whisper + News Cockpit

### Problem
Current calendar tab is a flat list of rows with no visual hierarchy, no date context on earnings, no sectioning — it looks like a basic data dump. Needs to feel like a premium trading intelligence cockpit.

### Design Overhaul

**Two distinct sections with visual separation:**

#### 1. Economic News Section (Top)
- **"News & Events" header** with live pulse dot
- **Today's highlight card** — if there's a high-impact event today, show it as a hero card with large text, countdown timer ("Drops in 2h 15m"), and glowing red/amber border based on impact
- **Weekly timeline** — keep the day pills but make them larger, more Robinhood-like with event count badges
- **Event rows redesigned** — taller cards, left impact bar stays but add time in large mono font on left side, event name prominent, Prev/Est/Act in a clean 3-column grid on right with subtle dividers
- **Group by time of day** — "Pre-Market (8:30 AM ET)" / "Market Hours" / "After Hours" sub-headers

#### 2. Earnings Section (Bottom)
- **"Earnings This Week" header** with calendar icon
- **Date-grouped earnings** — group by date with sticky date headers ("Monday, Apr 7" / "Tuesday, Apr 8")
- **Earnings cards redesigned** — each card shows:
  - Large ticker in bold mono (left)
  - Company timing badge ("BMO" / "AMC") with color coding
  - Date shown explicitly ("Apr 7")
  - EPS Est / EPS Act in clean columns
  - Revenue Est if available
- **Visual density** — compact but readable, show 8-10 per visible scroll area
- Cards get a subtle green/red tint when actual beats/misses estimate

#### 3. Additional Premium Touches
- **"Market Pulse" status strip** at very top — one-liner: "3 high-impact events this week · 47 earnings reports"
- **Smooth skeleton loading** with shimmer
- **Auto-refresh indicator** — small "Updated 5m ago" timestamp
- **Filter pills** — "All" / "High Impact Only" / "Earnings Only" toggle

### Hook Fix
The current hook makes a duplicate call (supabase.functions.invoke AND fetch). Remove the first dead call. Also group earnings by date for the new UI.

### Files

| File | Action |
|------|--------|
| `src/components/academy/community/EconomicCalendarTab.tsx` | Full rewrite |
| `src/hooks/useEconomicCalendar.ts` | Fix duplicate fetch, add date-grouped earnings |

Edge function stays as-is — data is fine, only the UI needs the overhaul.

### Key Design Tokens
- Cards: `bg-card/80 border border-white/[0.06] rounded-2xl` (vault-luxury style)
- Impact high: red-500 bar + `bg-red-500/5` card tint
- Impact medium: amber-400 bar
- Earnings beat: subtle `bg-emerald-500/5` tint
- Earnings miss: subtle `bg-red-500/5` tint
- Typography: mono for numbers/tickers, semibold for labels
- Spacing: generous padding (px-4 py-3.5), 16px border radius

