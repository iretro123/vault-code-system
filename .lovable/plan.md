

# Redesign: My Trades Mobile Layout — iOS-Grade Organization

## Current Problems (from screenshot)
1. **Header is messy** — "My Trades" title wraps to 2 lines while action buttons float awkwardly beside it, creating visual imbalance
2. **Subtitle takes too much space** — "Your trading command center — log, track, and improve." wastes vertical real estate on mobile
3. **Too many full-width cards stacked** — everything looks the same priority, no visual hierarchy
4. **Balance Management card buried** — important action lost in the scroll
5. **No section grouping** — cards just stack with uniform spacing, no iOS-style sectioning

## Redesign Plan

### 1. Compact Header (iOS-style)
- Single-line title "My Trades" at 24px (not 28px)
- Hide subtitle on mobile — it's redundant
- Action buttons: pill-shaped, right-aligned on same line as title
- Tighter vertical padding (pt-4 pb-2 instead of pt-6 pb-4)

### 2. Performance HUD — Tighter Grid
- Reduce cell padding from py-3 to py-2.5
- Slightly smaller text for labels (keep values bold)
- Add subtle inner shadow for iOS "inset card" feel

### 3. Section Grouping with Labels
Group cards into labeled iOS-style sections with tiny uppercase headers:
- **PERFORMANCE** — HUD + Equity Curve (already exists, just add label)
- **ACCOUNT** — Balance Management (compact inline, not a full card — just a row showing balance with pencil icon, expandable)
- **TODAY** — VAULT Check card
- **INTELLIGENCE** — AI Mentor carousel
- **JOURNAL** — Trade entries + export
- **REVIEW** — Weekly Review + Performance Breakdown

### 4. Balance Management — Inline Row
Convert from a full card to a slim inline row on mobile:
- Left: Wallet icon + "Balance" label
- Center: $15,601 bold
- Right: Pencil icon
- Expands inline when tapped (same update form)
- Reset link hidden in expanded state only

### 5. Reduce Spacing
- `space-y-5` → `space-y-4` on mobile
- Cards get `p-4` instead of `p-5` on mobile
- Section labels: `text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 font-semibold pl-1 mb-1.5`

## Files Changed

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Restructure render order into labeled sections, compress header, tighten HUD padding, convert balance card to inline row on mobile |
| `src/components/layout/PageHeader.tsx` | Add optional `compact` prop that reduces sizing on mobile |

