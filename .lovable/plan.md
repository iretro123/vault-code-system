

## Manual Data Fix + Countdown Timer for Economic Calendar

### What Changes

**1. Insert missing events from Forex Factory screenshot**

The current database has 25 events but is missing key Friday Apr 10 items (CPI reports, UoM data) and some impact levels are wrong. Will:
- Add Core CPI m/m, CPI m/m, CPI y/y for Apr 10 (all HIGH impact)
- Add Prelim UoM Consumer Sentiment and Inflation Expectations for Apr 10
- Add GDP Price Index q/q for Apr 9
- Fix ISM Services impact from "medium" → "high"
- Update Durable Goods estimate to match FF data (0.5% for core)

**2. Add countdown timer for today's next upcoming event**

At the top of the calendar, show a "Next Up" hero card for the nearest future event today with a live countdown using the same Pill/Colon style from `NextGroupCallCard`:
- Glass card with event name, time, impact badge
- Countdown pills: `HH : MM : SS`
- Only shows for today's events that haven't passed yet
- Disappears when no more events today

**3. Premium UI polish**

- "Next Up" card: `bg-white/[0.03] backdrop-blur border border-white/[0.06] rounded-2xl` with subtle glow for high-impact
- Keep current event list below but add subtle "TODAY" highlight on today's date section
- Impact badges get slightly larger with icon dots

### Files

| File | Action |
|------|--------|
| `market_events` table | Insert ~7 missing events, update ~2 impact levels via SQL |
| `src/components/academy/community/EconomicCalendarTab.tsx` | Add countdown timer hero card + today highlight |

### Data to Insert

| Event | Date | Time | Impact | Forecast | Previous |
|-------|------|------|--------|----------|----------|
| Core CPI m/m | Apr 10 | 08:30 | high | 0.3% | 0.2% |
| CPI m/m | Apr 10 | 08:30 | high | 1.0% | 0.3% |
| CPI y/y | Apr 10 | 08:30 | high | 3.4% | 2.4% |
| Prelim UoM Consumer Sentiment | Apr 10 | 10:00 | medium | 52.1 | — |
| Prelim UoM Inflation Expectations | Apr 10 | 10:00 | medium | — | — |
| GDP Price Index q/q | Apr 9 | 08:30 | medium | 3.8% | 3.8% |

Update ISM Services impact → "high"

