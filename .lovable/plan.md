

# Premium Trading OS — Final Design Pass

## Design Diagnosis

Looking at the current screenshot, the problems are immediately clear:

1. **The Plan stage is a void** — the left 70% of the hero card is completely empty. The VaultTradePlanner isn't rendering (likely `!activePlan && todayStatus !== "complete"` passes but the planner itself shows nothing until price is entered). This leaves a massive blank canvas.
2. **The hero card is a grey box with a grey box inside it** — border-on-border, card-inside-card. The right rail feels bolted on.
3. **The command bar looks like a spreadsheet row** — thin grey cells with pipe dividers. Not premium.
4. **Tabs are weak** — "Plan" has a blue pill, others are barely visible grey text. No sense of progression or system.
5. **Right rail is a disconnected sidebar** — "ACTIVE PLAN / RISK BUDGET / TRADES / SESSION" stacked vertically with too much dead space between sections.
6. **The bottom analytics section starts with a lonely "PERFORMANCE & HISTORY" label** — feels like an afterthought.
7. **Everything uses the same grey-on-dark-grey** — no visual hierarchy, no focal point, no depth.
8. **Too much vertical space wasted** — the hero card is ~400px tall but only ~30% of it has content.

## New Design Direction

**Principle: "One surface, not nested boxes."** The hero card should feel like a single integrated terminal, not containers inside containers. Remove inner borders, merge the rail into the surface, use spacing and typography (not borders) to create hierarchy.

### Layout Architecture (revised)

```text
┌─────────────────────────────────────────────────────┐
│ ● GREEN  $15,601  +$0 today  0/2 trades    [+ Log] │ ← command bar: seamless, no inner borders
├─────────────────────────────────────────────────────┤
│ ① Plan    ② Live    ③ Review    ④ Insights          │ ← segmented control: raised active pill
├───────────────────────────────────┬──────────────────┤
│                                   │ $100 risk left   │
│   [Stage Content]                 │ 0 / 2 trades     │
│   fills available space           │ 9:30–12:00       │
│   no empty void                   │ ● Clear to trade │
│                                   │ [Check Trade]    │
├───────────────────────────────────┴──────────────────┤
│ AI: Grade B · Leak: Oversizing · Edge: AM scalps    │ ← intelligence strip (stays)
└─────────────────────────────────────────────────────┘
```

### Visual System Changes

**Typography & Contrast:**
- Primary data: `text-foreground` (full white, no opacity reduction)
- Labels: `text-muted-foreground/70` (not /40 or /50 — those are illegible)
- Support text: `text-muted-foreground/50` minimum
- Hero numbers (balance, risk): `text-base font-bold` — not oversized
- Section labels: `text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold`

**Spacing & Density:**
- Hero card padding: `p-2.5` uniform, no `p-4` anywhere
- Section gaps: `space-y-2` max inside hero, `space-y-1.5` in rail
- Rail width: `flex-[0.7]` (slimmer)
- No gap between command bar and hero card — stack flush with `space-y-1.5`

**Borders & Surfaces:**
- Command bar: remove inner `border-r` dividers → use `gap-4` spacing instead
- Hero card: single `border border-white/[0.06]` outer shell, NO inner border between left/right
- Right rail separator: thin `border-l border-white/[0.04]` (nearly invisible) 
- Remove ALL `rounded-xl` → `rounded-lg` everywhere
- Remove decorative gradient `h-px` lines

**Buttons:**
- Primary CTA: solid `bg-primary` with subtle glow, `h-8 rounded-lg text-[11px]`
- Ghost actions: `text-primary hover:bg-primary/10`, no borders
- Log button in command bar: `h-7` compact pill

### Stage-Specific Fixes

**Plan Stage (the biggest problem):**
- When no plan AND planner is showing: the VaultTradePlanner in embedded mode should feel native — direction toggle + price input should be visible immediately, not hidden behind empty space
- When plan exists: compact 2-line summary with inline Log + Go Live buttons
- Remove the massive empty void — ensure the planner content fills the space

**Live Stage:**
- Active plan as a compact header row (not a card)
- Today's stats as a single inline row (trades / P/L / compliance)
- Limits section stays
- Stage transition CTA at bottom

**Review Stage:**
- Two action buttons as simple rows, not cards with icon boxes and chevrons
- Recent trades list stays but with `py-1` rows

**Insights Stage:**
- Keep the 4-cell grid (Grade/Leak/Edge/Next)
- AI card below

### Right Rail Compression
- Remove section label text ("ACTIVE PLAN", "RISK BUDGET", "TRADES") — use icons + values only
- Vault status: single line with dot + text
- Risk: `$100` with tiny progress bar, no "of $100" label
- Trades: `0/2` inline, dot indicators `h-1.5`
- Session: compact 3-cell time grid or "Set times" link
- Quick action button: `h-7 w-full`
- Total rail height should shrink ~40%

### Command Bar Redesign
- Remove `border-r` cell dividers → use natural spacing
- Status dot + vault status as first element
- Balance as primary focal point (slightly larger)
- P/L, trades, risk as secondary inline values
- Log button right-aligned, compact

## Files Changed

1. **`src/pages/academy/AcademyTrade.tsx`** — flatten command bar dividers, tighten hero card, adjust stage content spacing, pass embedded prop, slim rail width
2. **`src/components/trade-os/OSTabHeader.tsx`** — raised pill active state (bg-white/[0.08]), tighter padding, better inactive contrast
3. **`src/components/trade-os/OSControlRail.tsx`** — remove section labels, compress to icon+value rows, slimmer overall
4. **`src/components/vault-planner/VaultTradePlanner.tsx`** — tighten embedded mode further: remove rules strip in embedded (redundant with command bar), ensure content renders visibly
5. **`src/index.css`** — minor card class tweaks

## What Does NOT Change
- All hooks, handlers, data pipelines
- Approval calc logic
- Modal/sheet components
- Feature flag gating
- Lower analytics section (mostly fine)

