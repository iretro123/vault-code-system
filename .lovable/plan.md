

# Move Guide Rail Inside the Hero Card (Left Side)

## Problem
The control rail was placed as a separate column outside the hero card, creating a disconnected layout. User wants it **inside** the hero card on the left side — a unified "cockpit" feel.

## Layout Change

```text
CURRENT (broken):
┌──────────┐ ┌────────────────────────────┐
│ Rail     │ │ Hero OS Card               │
│ (outside)│ │ Tabs + Content             │
└──────────┘ └────────────────────────────┘

FIXED:
┌─────────────────────────────────────────┐
│ Hero OS Card                            │
│ ┌────────────┬─────────────────────────┐│
│ │ Guide Rail │ Tabs + Content          ││
│ │ (inside)   │                         ││
│ └────────────┴─────────────────────────┘│
└─────────────────────────────────────────┘
```

## File: `src/pages/academy/AcademyTrade.tsx`

1. **Remove the outer flex wrapper** (lines 726-749) that creates the separate left column
2. **Move `<OSControlRail>` inside the hero card** — add a `flex` layout inside the `.vault-os-card` div: left side is the rail (`w-[240px] shrink-0 border-r border-white/[0.06]`), right side is the existing tabs + content (`flex-1`)
3. Rail hidden on mobile (keep `hidden lg:block`)
4. The main content div (`flex-1 min-w-0 space-y-1.5`) no longer needs the wrapper — hero card becomes the direct child again

## File: `src/components/trade-os/OSControlRail.tsx`

Premium readability pass — upgrade remaining low-contrast text:

1. Replace `text-foreground/50` hints → `text-foreground/60`
2. Replace `text-foreground/60` labels → `text-foreground/70`
3. Replace `text-[10px]` section label → slightly bolder with `font-bold`
4. Active stage description `text-foreground/90` → `text-foreground` (full white)
5. Inactive stage descriptions `text-foreground/50` → `text-foreground/60`
6. Add subtle top padding and a refined card header treatment
7. Remove outer `space-y-3` wrapper — use `p-4 space-y-4` for proper card-interior spacing since it's now inside the hero card

## Files touched

| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Move rail inside hero card, remove outer flex wrapper |
| `src/components/trade-os/OSControlRail.tsx` | Readability upgrade, interior padding for in-card layout |

