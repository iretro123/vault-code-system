

# Trade OS — Hierarchy, Clarity & Command Center Overhaul

This addresses all 7 UX issues raised: state confusion, hierarchy, readability, Live screen authority, and Insights density. No new screens or features — just making what exists feel clear, fast, and commanding.

---

## Changes

### 1. Replace 14-day streak dots with a Progress Ring
**File:** `src/pages/academy/AcademyTrade.tsx` (hero card, lines 596-618)

Remove the row of 14 tiny dots. Replace with a single 48px SVG ring on the right side of the hero card showing weekly compliance as a circular progress indicator (e.g., 85% filled in emerald). The ring sits right-aligned next to the balance, replacing the current empty space. Inside the ring: compliance % number. Below: "This week" label. This gives the hero card a clear visual anchor without the noise of 14 dots.

### 2. Fix State Collision — Remove "Session Complete" from Plan Stage
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 762-770)

The "Session complete" banner with Insights button currently renders inside the Plan stage. This creates a confusing time-state collision. Fix: **only show it in the Review stage** (where it already exists at lines 986-994). Remove the duplicate from Plan stage entirely. When `todayStatus === "complete"` and user is on Plan, show instead: "✓ Today's session is done. Come back tomorrow." — a single line, no CTA, no cross-stage navigation.

### 3. Strengthen Stage Hierarchy — Single Primary CTA per Stage
**File:** `src/pages/academy/AcademyTrade.tsx`

Each stage should have ONE obvious thing to do:
- **Plan stage**: If no plan → planner is the action (already works). If plan exists → "Start Session" button is primary (already works). Remove the budget card's visual weight by making it collapsible (default closed) — the planner already shows these numbers.
- **Live stage**: The active plan card is correct. Move `StageHeadline` removal — the plan card IS the headline on Live. Replace the current StageHeadline with a tighter status line: vault status dot + "Live · 2/3 trades · $180 risk left" — all in one line above the plan card.
- **Review stage**: Already strong. No changes needed.
- **Insights stage**: Already good structure. Address density separately (point 7).

### 4. Make Today's Budget Collapsible on Plan Stage
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 676-730)

Wrap the Budget grid in a `<Collapsible>` defaulting to **closed**. Show a single summary line: "$120 risk · $600 cap · 3 trades" with a chevron to expand. This declutters Plan and makes the planner/active plan the clear primary focus.

### 5. Upgrade Live Stage to Command Center Feel
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 774-874)

Replace `StageHeadline` on Live with an inline status bar:
```
[●] LIVE · SPY Calls 2ct · 1/3 trades · $180 risk remaining
```
This is a single row with the vault status dot, ticker, and key numbers — no title card needed.

The active plan card (lines 778-822): add a left border accent matching vault status (emerald/amber/red) for instant visual state. The "Mark Executing" → "Close & Log" flow stays as-is.

For the "No new entries" and "Session closed" banners: make them more commanding — full-width, bolder text, and a clear "what to do now" CTA embedded in the banner itself.

### 6. Boost Typography Contrast
**File:** `src/index.css` + throughout `AcademyTrade.tsx`

Global change: bump all `text-muted-foreground/50` and `/40` references in Trade OS cards to `/60` and `/50` respectively. Specifically:
- Hero card labels: `/50` → `/60`
- Budget labels: `/50` → `/60`  
- Session details labels: `/40` → `/50`
- Streak/stats text: `/40` → `/50`

This is ~15 className tweaks across the file. No design change — just readability on dark backgrounds.

### 7. Fix Insights Density — Summary + Expandable Detail
**File:** `src/components/trade-os/AIFocusCard.tsx` (carousel slides, line 461)

For the Leak and Edge slides: truncate the AI text to the first sentence. Add a "Read more" toggle that expands to show the full text. Bold the actionable phrase (the most important sentence) using a simple regex match on action words.

Also in the inline Insights grid (AcademyTrade.tsx lines 1065-1091): truncate each card's text to 60 chars with `...` and add `cursor-pointer` + click-to-expand behavior using local state.

### 8. Stage Selector — Bolder Active State
**File:** `src/components/trade-os/OSTabHeader.tsx`

The current active tab is subtle. Changes:
- Active tab: increase background opacity from `bg-white/[0.1]` to `bg-white/[0.14]`
- Active tab text: add `text-foreground` explicitly (currently inherits)
- Completed tabs: make the check circle slightly larger (w-4 h-4 outer, w-2.5 h-2.5 inner check)
- Add a subtle `font-bold` on the active tab label vs `font-semibold` on others

---

## Files Changed

| File | Changes |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Remove streak dots → add compliance ring. Fix state collision. Collapsible budget. Live status bar. Typography contrast bumps. Insights card truncation. |
| `src/components/trade-os/OSTabHeader.tsx` | Bolder active state, larger check circles |
| `src/components/trade-os/AIFocusCard.tsx` | Truncate + expand on Leak/Edge slides |

## What Does NOT Change
- No new screens, tabs, or components
- Review stage untouched (already strongest)
- Analytics section below OS card untouched
- Mobile CTA pill untouched
- Intelligence strip untouched
- All data logic unchanged

