

# Visual Polish Pass — VAULT Trading OS

## Current State (from screenshot audit)

The structure is correct (greeting → metrics → two-column hero → analytics). But visually:

1. **Metrics strip**: `gap-px` grid creates visible cell borders — looks like a spreadsheet, not a status bar. Each cell has `py-3.5 md:py-4` which is too tall. Labels are `text-[9px]` uppercase — too tiny and harsh.

2. **Hero card**: `rounded-2xl border border-border/20` with massive internal padding (`p-5 md:p-7`). The left zone is mostly empty space below "PRE-TRADE APPROVAL" label. The card feels like a giant dark rectangle.

3. **Right rail**: `flex-[0.9]` is too wide. Each module inside (`rounded-xl p-3.5 ring-1`) creates stacked bordered boxes — 5+ visible rectangles. The `text-[9px] uppercase tracking-[0.18em]` section labels feel noisy.

4. **Tabs**: Basic text + underline. `py-3.5 md:py-4` makes them too tall. They don't feel like a control.

5. **Buttons**: Full-width bright blue `rounded-xl` buttons ("Check Trade", "Log Trade") feel generic and heavy.

6. **Intelligence strip**: `text-[8px]` labels are unreadable. `py-3` cells are padded.

## Design Fixes

### 1. Metrics Strip → Seamless Status Bar
- Remove `gap-px` grid and `bg-border/10` background
- Single `bg-card` surface with `divide-x divide-border/10`
- Reduce cell padding: `px-4 py-2.5`
- Labels: `text-[10px]` not `text-[9px]`, lighter weight, no ALL-CAPS tracking overkill
- Numbers: `text-base font-semibold` not `text-xl font-bold`
- Log Trade button: `h-8` ghost-outline style, not full bright pill

### 2. Tabs → Compact Segmented Control
- Remove `border-b` separator between tabs and body
- Reduce tab padding: `px-4 py-2.5`
- Active state: subtle `bg-muted/10` fill + bottom bar, not just underline
- Text: `text-[11px]` not `text-[13px]`, `font-semibold` not `font-bold`
- Remove icons from inactive tabs (show only for active)

### 3. Hero Card → Lighter Container
- Border: `border-border/10` (softer)
- Shadow: `shadow-md shadow-black/10` (subtler)
- Left main: `p-4 md:p-5` (reduced from p-5/p-7)
- Rounded corners: `rounded-xl` not `rounded-2xl`

### 4. Right Rail → Slim Utility Column
- Width: `flex-[0.75]` not `flex-[0.9]`
- Remove individual module borders/rings — use `space-y-3` with subtle `divide-y`
- Reduce padding: `p-3 md:p-4`
- Status badge: inline row, not a bordered card
- Active plan: tighter, no bordered card wrapper
- Risk/Trades: inline rows not bordered cards
- Quick Action button: `h-8` not `h-9`, `rounded-lg` not `rounded-xl`

### 5. Buttons → Premium & Restrained
- Primary CTAs: `h-8 rounded-lg text-[11px]` not `h-9 rounded-xl text-xs`
- "Log Trade" in metrics: outline variant, not gradient
- Remove `w-full` from rail quick action — keep it prominent but not screaming
- Action cards in Review: remove `rounded-xl border` wrapper, use hover highlight only

### 6. Typography & Spacing
- Section labels: `text-[10px] tracking-[0.1em]` not `text-[9px] tracking-[0.18em]`
- Remove "PRE-TRADE APPROVAL" label above planner (redundant with tab name)
- Greeting: `text-xl md:text-2xl` not `text-2xl md:text-3xl`
- Status line: keep at `text-xs`
- Intelligence strip labels: `text-[9px]` not `text-[8px]`

### 7. Elements to REMOVE or Reduce
- Remove the `gap-px bg-border/10` grid pattern on metrics (replace with dividers)
- Remove individual `ring-1` and `border` on every rail module
- Remove icons from inactive tabs
- Remove the large icon placeholder in "No plan active" state (just text)
- Remove `shadow-lg` from hero card
- Reduce `animate-pulse` usage (keep only on active plan dot)

### Files Changed
1. **`src/pages/academy/AcademyTrade.tsx`** — metrics strip, hero card container, left zone padding, intelligence strip density
2. **`src/components/trade-os/OSTabHeader.tsx`** — compact segmented style
3. **`src/components/trade-os/OSControlRail.tsx`** — slim utility column, remove individual card borders

No logic changes. No handler changes. No hook changes.

