

# Honest Visual Audit — /academy/trade

## What I see (from the screenshot)

**No, it does not look clean or futuristic.** Here's what's specifically wrong:

### 1. The Hero OS Card is a giant grey slab
- `bg-card` (#1A212B) on `bg-background` (#11161C) — the contrast between these two is barely perceptible. The entire hero card reads as a murky dark rectangle with no visual confidence. It doesn't pop, it doesn't breathe, it just sits there.
- `border-border/10` is nearly invisible — the card has no defined edge.

### 2. The Segmented Tabs feel weak
- `bg-muted/5` container is invisible against the card. Active state `bg-card` on a `bg-card` parent = no visual distinction. The tabs look like floating grey text, not a control.
- The icons + text are too small and grey to command attention.

### 3. The VaultTradePlanner (Calls/Puts area) uses a completely different design language
- XP-style inline borders, different backgrounds, different button styling — it looks pasted in from a different app. The "Calls" button is a bright green-blue pill that clashes with the primary blue system.
- The grey chart placeholder with "Enter a price to start" is dead space.

### 4. Right Rail is too sparse and washed out
- "GREEN" status, "ACTIVE PLAN", "RISK BUDGET", "TRADES" — all in `text-[10px] text-muted-foreground/30` which is barely readable. The hierarchy is: tiny grey label → number → tiny grey label → number. It's monotonous.
- The risk progress bar and trade dots are almost invisible.
- "Check Trade" button is the only strong element but it's disconnected.

### 5. The Metrics Strip looks decent but is too flat
- Good structure but the numbers are too small (`text-base` = 16px). For a financial product, the balance should be the dominant visual element. "$15,601" should be bold and large.

### 6. Lower Analytics cards (Equity Curve, Performance Breakdown) are the best-designed parts
- These actually look premium. The equity curve has good contrast, the breakdown bars are clean. But they're pushed below the fold under a nearly invisible "PERFORMANCE & HISTORY" label.

### 7. The VaultTradePlanner's "Balance $15,601 / Loss Limit $156.01 / Level Medium" chips
- These rounded pill chips look decent but use a completely different visual language from the metrics strip above. Two different representations of the same data = visual noise.

### 8. Typography inconsistency
- Greeting: `text-xl font-bold` — good
- Status line: `text-xs text-muted-foreground/70` — barely visible
- Tab labels: `text-[11px] uppercase` — too small
- Rail labels: `text-[10px] text-muted-foreground/30` — invisible
- Metric labels: `text-[10px] text-muted-foreground/50` — slightly better
- Nothing feels like a unified type scale

---

## What needs to change

### A. Hero Card — Give it visual presence
- Increase border contrast: `border-white/[0.06]` instead of `border-border/10`
- Add a very subtle inner glow or top-edge highlight (1px `border-t border-white/[0.08]`)
- This is the centerpiece — it should feel elevated

### B. Tabs — Make the active state visible
- Active: `bg-white/[0.08]` with stronger text color and a subtle `shadow-sm`
- Container: `bg-black/20` (darker than card, creating true inset)
- Larger text: `text-xs` not `text-[11px]`

### C. Right Rail — Stronger hierarchy
- Status dot should be larger (3px → 4px) with a glow effect for GREEN
- Section headers: `text-[11px]` not `text-[10px]`, `text-muted-foreground/50` not `/30`
- Risk number: `text-xl font-bold` not `text-lg`
- Add a subtle background tint to the status row

### D. Metrics Strip — Bolder numbers
- Balance: `text-lg md:text-xl font-bold` — this is the most important number
- Other metrics: `text-base font-semibold` (keep current)
- Add subtle hover states on each cell

### E. VaultTradePlanner integration
- The planner uses XP-style tokens (`xp.inputBg`, `xp.btnBorder`) which clash with the OS card. It needs a pass to harmonize its surface colors with the parent card, or at minimum remove its own outer border/bg so it inherits the hero card's surface.
- The Calls/Puts toggle should use the same primary blue as the rest of the app, not the XP green-blue gradient.

### F. Typography scale
- Establish 4 clear levels:
  1. **Hero numbers**: `text-xl font-bold` (balance, risk budget)
  2. **Section values**: `text-base font-semibold` (P/L, trades, streak)  
  3. **Labels**: `text-[11px] font-medium text-muted-foreground/50` (all section labels)
  4. **Support**: `text-[10px] text-muted-foreground/35` (tertiary info only)

### G. Color: reduce grey death
- Add subtle primary tint to active/important surfaces (`bg-primary/[0.03]`)
- Use emerald/red tints on status surfaces instead of flat grey
- The "GREEN" status should have a subtle emerald glow, not just green text on grey

---

## Files to change

1. **`src/pages/academy/AcademyTrade.tsx`** — Hero card borders, metrics strip number sizing, rail width, typography consistency, intelligence strip refinement
2. **`src/components/trade-os/OSTabHeader.tsx`** — Darker inset container, stronger active state, larger text
3. **`src/components/trade-os/OSControlRail.tsx`** — Stronger hierarchy, larger numbers, status glow, readable labels
4. **`src/components/vault-planner/VaultTradePlanner.tsx`** — Harmonize Calls/Puts toggle color with primary blue, soften outer border to blend with hero card
5. **`src/components/vault-planner/xp-styles.ts`** — Adjust `btnActiveBg` to use primary blue instead of XP blue, align surface colors closer to card system

## What does NOT change
- All data flow (unified balance, plan state, AI auth)
- All handlers and hooks
- All modal/sheet components
- Lower analytics cards (already good)
- Core VaultTradePlanner logic

