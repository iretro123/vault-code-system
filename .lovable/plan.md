

## Weekly Reset for Gameplan Card

**Scope:** Add local 7-day auto-reset for This Week + Consistency tasks, preserve Foundation. Add a subtle label near the progress bar. No UI redesign.

### File: `src/components/academy/dashboard/GameplanCard.tsx`

**1. New localStorage key for reset tracking**

Add `LS_RESET_KEY = "va_gameplan_last_reset"` to store the ISO timestamp of the last weekly reset.

**2. Reset logic on mount (inside `useEffect` or initializer)**

On component load:
- Read `lastResetAt` from localStorage
- If null or 7+ days ago:
  - Remove all This Week (`tw-*`) and Consistency (`consistency-*`) task IDs from `completedMap`
  - Keep all Foundation (`foundation-*`) entries intact
  - Write updated `completedMap` back to localStorage
  - Write current timestamp to `LS_RESET_KEY`

This runs once on mount before the first render cycle completes.

**3. Compute days until next reset**

Derive `daysUntilReset` from `lastResetAt`:
```
const daysSince = Math.floor((now - lastResetAt) / 86400000);
const daysLeft = Math.max(7 - daysSince, 0);
```

**4. Add subtle label below progress bar**

After the existing `<Progress>` element (line 150), add a single line:

```
<span className="text-[10px] text-muted-foreground/40">
  Resets in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
</span>
```

Same styling tier as existing "This week" label — tiny, muted, non-intrusive.

**5. No other changes**

- Same card shell, sections, task rows, toggle logic, recently completed, mobile expand
- Foundation completions preserved across resets
- Recently Completed entries for reset tasks naturally disappear since they're removed from `completedMap`

