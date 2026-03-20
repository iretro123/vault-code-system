

## Premium UI/UX Redesign — Luxury Presentation Pass

### Problem Summary
The current Trade OS renders too many equal-weight cards, creating a dense dashboard feel. The NYSE bar is thin and weak. The visual palette over-relies on flat blue. The experience needs stronger hierarchy, fewer visible elements, and a luxury AI fintech aesthetic.

### Design Philosophy
- **Obsidian/graphite base** with electric blue as accent only
- **Three-card max** visible at any stage — progressive disclosure for the rest
- **Hero-first** layout — one dominant element per stage, everything else subordinate
- **Richer depth** — layered gradients, glass surfaces, subtle glow semantics

---

### 1. Redesign NYSE Session Bar into Premium Hero Timeline

**File: `NYSESessionBar.tsx` — full rewrite of JSX/styling (logic stays)**

Current: thin h-3 rounded-full bar with tiny labels — feels like a loading indicator.

New design:
- **Thick pill track**: `h-7 rounded-2xl` with layered glass background (`bg-gradient-to-b from-white/[0.04] to-white/[0.02]`, inner shadow, outer subtle border)
- **Active zone**: filled with a gradient (`from-emerald-500/25 via-primary/20 to-primary/15`) with a soft outer glow (`box-shadow: 0 0 20px rgba(59,130,246,0.15)`)
- **Amber caution zone**: gradient fill `from-amber-500/15 to-amber-500/10`
- **Locked zone**: `from-red-500/10 to-red-500/[0.05]` with subtle cross-hatch overlay or dimmed opacity
- **Now-marker**: larger `h-5 w-5` with double-ring glow effect (inner solid dot + outer ring + box-shadow pulse), `transition-[left] duration-1000`
- **Time labels**: upgraded to `text-[10px]` with better spacing, positioned below the bar with connecting tick marks
- **Header row**: "NYSE Session" label + ET time range, slightly larger text
- **Overall container**: `rounded-2xl p-4` with `vault-premium-card` class for depth

### 2. Redesign "Start Your Day" — Hero Risk Card + Progressive Disclosure

**File: `AcademyTrade.tsx` (plan stage, lines ~848–1007)**

Current: Daily Risk Rules card → Direction/Ticker card → RewardTargets → ContractFramework → CTA — 5 visible sections, all equal weight.

New layout — **3 visible elements max**:

**A. Hero Risk Card** (single dominant card, `vault-luxury-card` class)
- Top section: Account Balance (text-3xl, prominent) + Update button
- Risk % selector (existing, kept inline)
- **2×2 metric grid** (not 3×3) showing only the 4 most important:
  - Max Daily Loss
  - Risk Per Trade
  - Max Contracts
  - Max Trades
- Remove "Stop After" and "Max Spend" from primary view — they're derivable
- Direction toggle + Ticker input **moved inside** this card as a bottom section
- Tier/risk summary line at bottom
- The card should have the `vault-luxury-card` gradient and shimmer top-edge

**B. Collapsible "Session & Targets" section** (collapsed by default)
- Contains: Reward Targets Strip + Session Window preview
- Single chevron-toggle, styled as a subtle expandable row

**C. Collapsible "Contract Framework"** (already collapsible — keep as-is)

**D. Primary CTA**: "Lock In Today's Rules" — keep but upgrade styling:
- Add `vault-cta-shine` shimmer class
- Slightly taller: `h-12`
- Richer shadow: `shadow-[0_4px_24px_rgba(59,130,246,0.2)]`

### 3. Redesign "Go Live" — Session Control Room with 3 Major Cards

**File: `AcademyTrade.tsx` (live stage, lines ~1012–1120)**

Current: DisciplineMetricsStrip → VaultStatusBadge → NYSEBar → LiveSessionMetrics → RewardTargets → Active Rules → Session Timer → FocusReminders → Log CTA → End CTA — 10 sections.

New layout — **hero + 3 cards + actions**:

**A. Hero Header Zone** (not a card — just styled content at top)
- Large Vault Status indicator: "Vault: Clear" with emerald glow dot, text-2xl
- Subtitle: "Trade your session. Stay inside your rules."
- Discipline score + session grade shown as **inline pills** next to the vault status (not separate cards)

**B. NYSE Session Bar** (prominent, hero-width — the redesigned premium version)

**C. Three major cards** (each `vault-glass-card` styled):

1. **"Your Limits"** — consolidates LiveSessionMetrics into a cleaner 2×2:
   - Daily Buffer / Risk Per Trade / Trades Left / Max Contracts
   - Remove Loss Streak and Stop Rule from the card face (tuck into tooltip or expandable)
   - Add Reward Targets as a subtle inline row at the bottom of this card

2. **"Your Session"** — consolidates Session Timer + Active Rules:
   - Session timer/countdown at top
   - Active plan summary (direction, ticker, max loss) below
   - Cancel button tucked small

3. **"Your Focus"** — consolidates FocusReminderCards into a single card:
   - 3 bullet points instead of 3 separate cards
   - Cleaner, single-card presentation

**D. Actions** (bottom):
- Quick Log Trade button (keep)
- End Session pill (keep)

**Remove from default view**: DisciplineMetricsStrip as a full 6-card row. Instead, show 2-3 key metrics as inline pills in the hero header.

### 4. Upgrade DisciplineMetricsStrip — Compact Inline Mode

**File: `DisciplineMetricsStrip.tsx`**

Add a `compact` prop. When `compact=true`:
- Render as a single-line horizontal row of small text pills (not cards)
- Format: `Discipline 82% · Grade A · Streak 5 · Rules 91%`
- Vault Status shown separately in the hero, so omit from compact strip
- Reduce to 4 metrics max in compact mode
- Style: `text-[10px] font-medium` pills with dot separators, no borders

### 5. Upgrade Visual Language — CSS Additions

**File: `src/index.css`**

Add new utility classes:

- **`.vault-obsidian-surface`**: deeper obsidian base (`hsl(214, 26%, 8%)`) with subtle noise texture via CSS, for use as card backgrounds that feel richer than `bg-white/[0.03]`
- **`.vault-hero-glow`**: radial gradient glow behind hero elements, status-aware (green/amber/red variants via CSS custom property)
- **`.vault-metric-cell`**: standardized metric cell with frosted glass, used consistently across both stages
- **`.vault-stage-enter`**: `animation: fade-in 0.4s ease-out, scale-in 0.3s ease-out` for stage transitions
- **`.vault-launch-streak`**: desktop-only keyframe — a brief luminous streak/pulse that plays once when entering Go Live (a horizontal light sweep across the hero area, 0.8s, plays once). Elegant and fast, not playful.

### 6. Stage Transition Animation

**File: `AcademyTrade.tsx`**

- Wrap each stage's content in a `div` with `className="animate-fade-in"` (already exists in the animation system)
- For the Go Live stage specifically on desktop: add the `vault-launch-streak` class to the hero area on mount (remove after animation completes via `onAnimationEnd`)

### 7. VaultStatusBadge — Upgrade to Hero Mode

**File: `VaultStatusBadge.tsx`**

Add a `hero` prop. When `hero=true`:
- Render larger: text-2xl status label, bigger shield icon
- Full-width with centered content
- Richer glow: double-layer box-shadow
- Background: status-tinted radial gradient (not just flat bg-opacity)

When `hero=false`: keep current compact version.

### 8. LiveSessionMetrics — Consolidate into "Your Limits" Card

**File: `LiveSessionMetrics.tsx`**

Refactor to accept a `variant` prop:
- `variant="grid"` (current 3×2 grid — keep for backwards compat)
- `variant="compact"` (new default for Go Live): 2×2 grid, only 4 metrics, with optional reward targets row at bottom
- Remove Loss Streak and Stop Rule from the compact variant (show in expandable or tooltip)

### 9. FocusReminderCards — Single Card Mode

**File: `FocusReminderCards.tsx`**

Add a `layout` prop:
- `layout="grid"` (current 3-card grid)
- `layout="unified"` (new): single card with all 3 sections as bullet groups inside one card, reducing visual density

---

### Files Summary

| File | Change Type | Description |
|------|------------|-------------|
| `NYSESessionBar.tsx` | Major restyle | Thick pill timeline, glass styling, larger marker |
| `AcademyTrade.tsx` | Layout restructure | Hero card + 3 cards pattern for both stages |
| `DisciplineMetricsStrip.tsx` | Add compact mode | Inline pill format for Go Live hero |
| `VaultStatusBadge.tsx` | Add hero variant | Larger, richer for Go Live header |
| `LiveSessionMetrics.tsx` | Add compact variant | 2×2 with inline rewards |
| `FocusReminderCards.tsx` | Add unified layout | Single card instead of 3 |
| `index.css` | New utilities | obsidian surface, hero glow, launch streak animation |

### What Does NOT Change
- Core logic, hooks, data flow
- Database schema
- 4-stage architecture
- OSTabHeader, OSControlRail
- Review and Insights stages
- Mobile layout patterns
- Auth, permissions, feature flags

