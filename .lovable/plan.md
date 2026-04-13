

## Redesign "Your Onboarding" Card — iOS/Robinhood Premium Feel

### The Problem
The GameplanCard is visually dense and stacked: multiple bordered rows, small text, crowded checkboxes, inline styles, and a cluttered "Recently Completed" section. It looks like a to-do list, not a premium onboarding experience.

### The Redesign

**Visual direction:** Robinhood's clean card style — generous whitespace, large tap targets, smooth transitions, one clear focal point at a time.

**1. Header — minimal and confident**
- Title: "Your Onboarding" stays, but with a subtle progress ring (circular, like Apple Watch) instead of the linear progress bar
- Small "2 of 5" counter next to the ring — no percentage text

**2. Next Step — hero treatment**
- The current next incomplete task gets a large, isolated card-within-card treatment
- Big icon (40px), bold title, one-line description, single CTA button
- Soft blue glow behind the icon — draws the eye immediately
- No other tasks compete for attention

**3. Task list — collapsed by default**
- Below the hero, remaining tasks shown as a clean minimal list
- Each row: circle checkbox + label only. No borders on individual rows, no inline styles
- Completed items get a subtle green check, muted text — no strikethrough (cleaner)
- Smooth slide-down animation when checking off a task (the next task slides into the hero slot)

**4. Remove visual clutter**
- Remove "Recently Completed" section entirely (it's noise for onboarding)
- Remove the "Resets in N days" timer from the progress area
- Remove the confetti burst (too playful for premium feel)
- Keep the admin cohort section but move it to a collapsible accordion so it doesn't bloat the card

**5. "All Done" state**
- When complete: single emerald check icon with "You're set up" — clean, no fanfare

### Layout Structure

```text
┌─────────────────────────────────────┐
│  Your Onboarding          ◯ 2/5    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎯  Set your risk rules    │    │
│  │  Define your daily limits   │    │
│  │         [ Open Trade OS → ] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ✓  Claim your role                 │
│  ✓  Watch first lesson             │
│  ○  Introduce yourself             │
│  ○  Set starting balance           │
│                                     │
└─────────────────────────────────────┘
```

### Technical Details

- Rewrite the render section of `GameplanCard.tsx` (lines 482-618)
- Replace inline `style={{}}` with Tailwind classes for consistency
- Use CSS `transition-all duration-200` for task completion animations
- Circular progress: simple SVG circle with `stroke-dasharray`/`stroke-dashoffset`
- Keep all existing logic (auto-detect, toggle, navigate, admin cohort) — only changing the visual layer
- Admin cohort section wrapped in a collapsible `<details>` element

### File Changed

| File | Change |
|------|--------|
| `src/components/academy/dashboard/GameplanCard.tsx` | Rewrite JSX render for premium iOS feel — hero next-step, minimal task list, circular progress, remove clutter |

