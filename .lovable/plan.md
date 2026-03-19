

## Rename "Cohort Tracker" + Premium Dashboard Design Upgrade

**Scope**: Design-only changes to the academy dashboard (`/academy/home`). No logic, data, or routing changes.

---

### 1. Rename "Cohort Tracker" to "Class Overview"

- File: `src/components/academy/dashboard/GameplanCard.tsx` (line 569)
- Change label from "Cohort Tracker" to "Class Overview"
- Alternative options: "Student Pulse", "Academy Pulse" — going with "Class Overview" for clarity and professionalism.

---

### 2. Elevate HeroHeader to full luxury tier

- File: `src/components/academy/dashboard/HeroHeader.tsx`
- Add a subtle top-edge highlight border (`border-t border-white/[0.08]`) and a deeper layered background gradient with a warm blue-to-transparent sweep.
- Upgrade the "Online" indicator with a softer glow ring effect.
- Give the greeting text a subtle text-shadow for depth.

---

### 3. Upgrade GameplanCard styling

- File: `src/components/academy/dashboard/GameplanCard.tsx`
- Add a faint inner glow line at the top (`inset 0 1px 0 rgba(255,255,255,0.05)`).
- "Next Step" highlight row: add a subtle left accent border (2px solid primary) for a premium rail feel.
- "Class Overview" section: add a frosted glass sub-card background (`bg-white/[0.03]` with rounded corners and subtle border) to visually elevate the admin analytics area.

---

### 4. Upgrade MyTradesCard

- File: `src/components/academy/dashboard/MyTradesCard.tsx`
- Add a subtle top-edge glow line matching the premium card system.
- Metric cells: add frosted glass backgrounds (`bg-white/[0.04]`, `rounded-lg`) for each metric mini-card.

---

### 5. Upgrade CoachCard

- File: `src/components/academy/dashboard/CoachCard.tsx`
- Strengthen the gradient background to be richer with a second color stop.
- Add a faint border-glow on hover.

---

### 6. Upgrade LiveCallsCard

- File: `src/components/academy/dashboard/LiveCallsCard.tsx`
- Add consistent premium card styling matching the elevated system.
- Session rows: subtle hover state with frosted glass lift.

---

### 7. Upgrade QuickAccessRow

- File: `src/components/academy/dashboard/QuickAccessRow.tsx`
- Each quick-access tile: add a subtle icon glow on hover (primary color at low opacity).
- Slightly increase padding and border radius for a more spacious luxury feel.

---

### 8. Add a premium card shimmer class (optional global enhancement)

- File: `src/index.css`
- Add `.vault-luxury-card` — a step above `vault-premium-card` with a stronger inset highlight, slightly warmer shadow, and a faint animated shimmer on the top edge for the hero and key cards.

---

### Files changed (design only)

| File | Change |
|------|--------|
| `GameplanCard.tsx` | Rename label + premium sub-card styling |
| `HeroHeader.tsx` | Richer gradient, glow accents, text depth |
| `MyTradesCard.tsx` | Frosted metric cells, top glow |
| `CoachCard.tsx` | Richer gradient, hover glow |
| `LiveCallsCard.tsx` | Premium card consistency |
| `QuickAccessRow.tsx` | Tile hover glow, spacious feel |
| `index.css` | New `.vault-luxury-card` class |

