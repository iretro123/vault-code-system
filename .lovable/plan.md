

# Premium Trade OS Page Headline

## Design

Insert a luxury "command center" headline block above the welcome hero card at line 571. This isn't a boring page title — it's a branded identity moment.

**Visual structure:**
```
TRADE OS                          (tiny glowing badge with shimmer)
Your Command Center               (bold 28-32px, subtle text-shadow)
Plan → Live → Review → Insights   (active stage glows in primary)
```

**Premium touches:**
- "TRADE OS" rendered as a micro-badge with `bg-primary/10 border-primary/20` and a subtle glow shadow — same luxury language as the ATH badge
- Headline uses `text-shadow` for depth, matching the balance number style
- The flow steps line uses a gradient arrow separator (`→`) with the active stage highlighted in primary with a faint glow, inactive stages in `text-muted-foreground/40`
- A luminous divider line below (same `via-primary/15` gradient already used in the hero card) to separate identity from content
- Entire block is compact: `pt-4 pb-2 px-1` — presence without bulk
- On mobile: headline drops to `text-2xl`, badge stays tiny

## Implementation

### File: `src/pages/academy/AcademyTrade.tsx`
Insert ~20 lines at line 571, right after the opening `<div className="px-3 md:px-5 ...">` and before the welcome hero card.

The block uses `activeStage` (already in scope) to highlight the current workflow step. Each step in the flow line maps to `["plan", "live", "review", "insights"]` — matching stage gets `text-primary font-semibold` with a `text-shadow` glow, others stay muted.

No new components, no new CSS classes, no new dependencies. Pure inline Tailwind + the existing design tokens.

