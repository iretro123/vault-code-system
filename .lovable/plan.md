

# Auto-Refresh AI Mentor + Navigation Arrows

## Changes

### 1. `src/pages/academy/AcademyTrade.tsx` — Cache & auto-refresh logic (~line 740-770)

**Daily auto-refresh**: Change the cache-busting logic so the cache key includes the date. When the user opens the page on a new day, the stale cache from yesterday is automatically invalidated and a fresh scan fires. No manual "Re-scan" needed.

**Evening nudge**: Add a `useEffect` that checks if the current hour is >= 18 (6 PM local) and the cached result's date is today but was fetched before 6 PM — if so, auto-refetch to give them updated evening insights based on the full day's activity.

### 2. `src/pages/academy/AcademyTrade.tsx` — Carousel footer (~lines 983-1010)

**Remove Re-scan button**. Replace the footer layout with centered dots flanked by left/right chevron arrows:

```text
  ‹   ● ○ ○ ○ ○ ○ ○   ›
```

- Left arrow: `ChevronLeft`, calls `emblaApi.scrollPrev()`, hidden/disabled on first slide
- Right arrow: `ChevronRight`, calls `emblaApi.scrollNext()`, hidden/disabled on last slide  
- Dots remain centered between them
- Arrows are subtle (`text-white/30 hover:text-white/60`), small (h-5 w-5)

### 3. `src/pages/academy/AcademyTrade.tsx` — Track `canScrollPrev`/`canScrollNext`

Add two state booleans synced from Embla's `select` event (same pattern as `selectedIndex`) to conditionally style/disable the arrows.

### 4. `supabase/functions/trade-focus/index.ts` — Add `vault_daily_checklist` pipeline

Fetch the last 10 daily checklist entries in the existing `Promise.all` and append a readiness summary to the system prompt. This gives the AI real mental-state data (sleep, emotional readiness) to reference. Add a `checklistSummary` section to the prompt so the AI can say things like "You tend to trade worse on days you report poor sleep."

### 5. Import `ChevronLeft`, `ChevronRight` from lucide-react (line 8-14)

Add to the existing icon import.

## Summary
- Cache auto-busts daily + re-scans in the evening for fresh end-of-day insights
- Re-scan button removed; replaced with left/right arrows flanking dot indicators
- Backend gains daily checklist data for richer, more personal coaching

