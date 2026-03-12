

# Upgrade: Community Right Rail — Live Data + Luxury Design

## Problems
1. **Coach Feed is fake** — hardcoded static strings ("Module 2 lesson 3 is incomplete") that never update from real data
2. **Your Week card is plain** — flat rows with no visual energy, no progress indication
3. **No urgency or motivation** — everything looks the same priority, nothing stands out
4. **No real progress tracking** — metrics exist but feel dead, no visual progress bars or streaks

## Plan

### 1. Your Week Card — Progress Rings + Streak
Replace flat text rows with mini circular progress rings for each metric and add a streak counter:
- **Trades ring**: arc showing trades logged vs. weekly goal (default 5)
- **Journal ring**: arc for journal entries this week
- **Playbook ring**: arc for playbook completion %
- Add **day streak** badge (consecutive days with at least 1 trade or journal logged) — fetched from `journal_entries` and `trade_entries`
- Luxury styling: subtle gradient border, inner glow on rings

### 2. Coach Feed — Real Data from DB
Replace hardcoded items with the same `detectStuck` + DB query pattern used in `CoachFeedCard` (the one on AcademyTrade page). Pull real signals:
- **Missing journal** — query `journal_entries` for yesterday, show only if actually missing
- **Broken rules** — use `detectStuck()` for real loss/rule-break detection
- **Playbook progress** — use `usePlaybookProgress()` hook (already imported) for real next chapter
- **Check-in status** — query `vault_daily_checklist` for today
- **Coach replies** — query `coach_ticket_replies` for unread answers
- Remove static items entirely; if no real nudges, show "All clear. Stay disciplined."
- Each item gets a colored left accent bar (red for urgent, amber for nudge, blue for info)

### 3. Visual Luxury Upgrade
- Cards get gradient border effect using `background: linear-gradient(...)` on a wrapper
- Coach Feed header: animated flame icon with CSS pulse glow
- Urgent items get a subtle red shimmer left border
- Progress rings use primary blue with trail glow
- Add micro-animation: items fade in staggered (animate-fade-in with delay)

### 4. Apply Same Changes to TradeFloorRightSidebar
The `TradeFloorRightSidebar.tsx` has the same static coach feed — update it to use the shared real-data coach feed component, or remove it since `CockpitPanel` already replaces it on desktop.

## Files Changed

| File | Change |
|---|---|
| `src/components/academy/community/CockpitPanel.tsx` | Rewrite YourWeekCard with progress rings + streak; rewrite CoachFeedCard with real DB queries; add luxury styling |
| `src/components/academy/community/TradeFloorRightSidebar.tsx` | Update CoachFeedCard to use same real-data pattern |

