

# Premium Enhancement — Trade OS

Make Trade OS feel luxury, fast, and simple for day traders. Focus on tactile feedback, visual polish, and reducing friction without adding complexity.

---

## Changes

### 1. Premium Hero Card — Glassmorphic Upgrade
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 539-643)

Upgrade the hero card surface:
- Add subtle radial gradient glow at top (`radial-gradient(ellipse at 50% 0%, primary/0.06, transparent 70%)`)
- Balance number: larger (text-4xl), with a subtle text-shadow for depth
- When ATH is hit, add a gold shimmer animation on the "★ New Personal Best" badge using CSS `@keyframes`
- P/L pill: slightly larger, add a subtle glow shadow matching its color (emerald glow for green, red glow for red)
- Streak dots: increase to 8px, add a subtle outer glow on green dots (`shadow-[0_0_4px_rgba(52,211,153,0.4)]`)
- Add a thin luminous divider between balance area and stats area

### 2. Tab Bar — Labels on Mobile + Premium Feel
**File:** `src/components/trade-os/OSTabHeader.tsx`

- Show labels on mobile (remove the `!isMobile &&` gate on line 52)
- Reduce font to `text-[10px]` on mobile to fit
- Add a subtle bottom highlight bar on the active tab (2px primary gradient line)
- Active tab: add a very subtle blue glow (`shadow-[0_0_8px_rgba(59,130,246,0.15)]`)

### 3. Performance HUD — Richer Cells
**File:** `src/components/trade-os/PerformanceHUD.tsx`

- Remove the spinning conic gradient animation (line 60-66) — it feels gimmicky, not luxury
- Replace with a clean, static `border-primary/10` with a subtle `shadow-[0_0_20px_rgba(59,130,246,0.06)]` outer glow
- Add a subtle hover effect on each cell: `hover:bg-white/[0.03]` transition
- STREAK cell: add a tiny flame emoji or colored indicator when streak ≥ 5

### 4. Log Trade Sheet — Faster + More Polished
**File:** `src/components/academy/LogTradeSheet.tsx`

- Success state ("Just Saved"): add a brief green checkmark animation (scale-in + fade) before showing "Log Another"
- "Save Trade" button: rename to just "Save" — shorter, faster feel
- Add haptic-style visual feedback: button briefly flashes emerald on successful save
- Quick Mode toggle: style as a pill/badge in the header instead of plain text link

### 5. Mobile CTA Bar — Premium Floating Pill
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 1199-1204)

- Change from full-width to a centered floating pill: `max-w-xs mx-auto`
- Add a subtle backdrop blur and shadow: `backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)]`
- Add a subtle glow matching primary color: `shadow-[0_0_12px_rgba(59,130,246,0.15)]`
- Slightly rounded: `rounded-2xl`

### 6. Intelligence Strip — Richer Glow
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 1118-1155)

- Add a subtle left-border accent: `border-l-2 border-primary/30`
- AI dot: make it slightly larger (2px → 2.5px) with a richer glow
- On hover, the strip should lift slightly: `hover:-translate-y-px transition-transform`

### 7. Card Surfaces — Consistent Premium Layer
**File:** `src/index.css`

- Add a new utility class `.vault-os-card` that combines:
  - `background: radial-gradient(ellipse 80% 150px at 50% 0%, rgba(59,130,246,0.03) 0%, transparent 70%), hsl(214, 22%, 14%)`
  - `border: 1px solid rgba(255,255,255,0.06)`
  - `border-radius: 12px`
  - `box-shadow: 0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)`
- Apply to the hero OS card (line 660), Weekly Review card, and Tracked Balance card for consistent depth

### 8. Weekly Review Card — Premium Summary
**File:** `src/components/trade-os/WeeklyReviewCard.tsx`

- Generated summary: add a subtle fade-in animation when results appear
- Stats grid cells: use the `.vault-os-card` background instead of `bg-muted/20`
- "Generate Weekly Review" button: add a subtle shimmer effect (the existing `.vault-cta-shine` pattern)
- Best/Worst day cards: slightly thicker left border for color accent

### 9. Stage Headlines — Cleaner Typography
**File:** `src/pages/academy/AcademyTrade.tsx` (StageHeadline component, lines 74-83)

- Remove the italic guidance line (line 81) — it's cluttered. The subtitle is enough.
- Title: bump to `text-lg` with `font-bold tracking-tight`
- Subtitle: `text-[11px]` stays but with slightly more opacity (`text-muted-foreground/70`)

### 10. Micro-Animations
**File:** `src/index.css`

Add CSS keyframes:
- `.vault-save-flash`: brief emerald border flash (0.3s)
- `.vault-ath-shimmer`: subtle gold shimmer sweep for ATH badge
- `.vault-fade-up`: 0.2s translateY(8px) → 0 for card content reveals

Apply `vault-fade-up` to stage content transitions. Apply `vault-ath-shimmer` to the personal best badge.

---

## Files Changed

| File | Changes |
|---|---|
| `src/index.css` | Add `.vault-os-card`, `.vault-save-flash`, `.vault-ath-shimmer`, `.vault-fade-up` utilities |
| `src/pages/academy/AcademyTrade.tsx` | Hero card premium surface, mobile CTA pill, intelligence strip polish, stage headline cleanup |
| `src/components/trade-os/OSTabHeader.tsx` | Show labels on mobile, active tab glow |
| `src/components/trade-os/PerformanceHUD.tsx` | Remove spinning animation, add static glow + hover states |
| `src/components/academy/LogTradeSheet.tsx` | Save button rename, success animation, quick mode pill |
| `src/components/trade-os/WeeklyReviewCard.tsx` | Fade-in animation, premium cell backgrounds, shimmer CTA |

## What Does NOT Change
- No new pages, routes, or features
- No data model changes
- No new dependencies
- All existing functionality preserved
- Color system unchanged (blue primary, emerald success, amber warning, red danger)

