

## Move Session Type Cards Inside the Two-Column Layout

Currently the 3 cards ("Our Live Experiences") sit in a full-width section below the hero+sidebar block, pushing content down and requiring scrolling. The fix: nest them inside the left column, directly under the hero card, so they sit alongside the right sidebar.

### Changes — `src/pages/academy/AcademyLive.tsx`

1. **Move the session cards section** (lines 437-460) from after the `</div>` closing the hero+sidebar flex container (line 435) to **inside** the left column `<div className="flex-1 min-w-0">` (after the hero card ends at line 393).

2. **Make cards more compact** for the narrower width:
   - Image height: `h-[150px]` → `h-[120px]`
   - Card padding: `p-5` → `p-4`
   - Remove bullet points entirely — just show title, subtitle, and schedule
   - Grid gap: `gap-4` → `gap-3`
   - Section top margin: `mt-4` → `mt-5`
   - Section header margin: `mb-5` → `mb-3`

3. **Result**: The left column contains Hero → Session Cards stacked vertically, right sidebar stays alongside. Everything fits on desktop without scrolling past the fold.

### Layout (ASCII)

```text
┌─────────────────────────────────────┬──────────┐
│  HERO (Next Live Session)           │ Sidebar  │
│                                     │ Attend.  │
├───────────┬───────────┬─────────────│ This Wk  │
│ PREPARE   │ EXECUTE   │ REVIEW      │ Replays  │
│ compact   │ compact   │ compact     │          │
└───────────┴───────────┴─────────────┴──────────┘
```

Single file edit, no new dependencies.

