

# Design Conflict Diagnosis & Fix — /academy/trade

## Root Cause

The `VaultTradePlanner` was originally built as a **standalone page** (`/academy/vault`) with its own card system (`vault-premium-card`, `vault-glass-card`, `vault-approval-choice-card`). These CSS classes add:
- `border-radius: 18px` (1.125rem)
- `box-shadow: 0 4px 24px rgba(0,0,0,0.35)`
- `radial-gradient` inner glows
- `padding: 1.25rem` on choice cards
- Full standalone card borders

When this component is **embedded inside the OS hero card**, you get **cards inside cards inside cards** — nested borders, compounding padding, conflicting radii, and visual noise. The planner thinks it's a standalone page. The OS thinks it's a panel. Neither wins.

This is why every "fix" so far felt incremental — the underlying architecture is fighting itself.

## What Changes

### 1. VaultTradePlanner — Add `embedded` mode (VaultTradePlanner.tsx)

Add an `embedded?: boolean` prop. When `true`:
- Remove the outer `vault-premium-card` wrapper on the Trade Check card — use a flat `space-y-2.5` div instead
- Remove the `h-px` gradient top-edge glow
- Remove the icon+title header ("Trade Check" with Crosshair) — redundant when inside OS
- Shrink direction toggle: `min-h-[38px]`, `py-2`, `text-xs`, `rounded-lg` not `rounded-xl`
- Shrink inputs: `h-9` not `h-11`
- Contract choice cards: `p-2` not `p-3`, `text-lg` contract number not `text-2xl`, `rounded-lg` not `rounded-xl`, remove the radial gradient background (use simple `bg-white/[0.02]`)
- Rules strip chips: `py-1` `px-2` `rounded-lg` `min-h-[28px]` — compact inline pills
- Hero Decision Card: `p-3` not `p-4`, status hero `py-3` not `py-4`, status text `text-2xl` not `text-3xl`, CTA `h-9` not `h-11`
- Custom Size collapsible: `p-2` not `p-3`
- Grid gap: `gap-2` not `gap-4` between columns

When `embedded` is false (standalone `/academy/vault` page), everything stays as-is.

### 2. AcademyTrade.tsx — Tighter OS shell

- Command bar: `h-9` not `h-10`, `rounded-lg` not `rounded-xl`
- Hero card: `rounded-lg` not `rounded-xl`, remove decorative `h-px` gradient
- Left zone padding: `p-2.5` not `p-3 md:p-4`
- Right rail: `p-2` not `p-3`
- Pass `embedded` prop to VaultTradePlanner
- Stage content `space-y-2` not `space-y-3`
- Active plan cards: `p-2` not `p-3`, `rounded-lg`
- Intelligence strip cells: `py-1.5` not `py-2`
- Lower analytics: `gap-2` not `gap-2.5`
- Remove the separate `PageHeader` — the command bar IS the header

### 3. OSTabHeader.tsx — Compact tabs

- Outer: `px-2.5 pt-2 pb-1` not `px-3 pt-3 pb-2`
- Tab buttons: `py-1.5` not `py-2.5`, `text-xs` not `text-[13px]`
- Container: `rounded-lg` not `rounded-xl`, `p-0.5` not `p-1`
- Guidance text: `text-[11px]` not `text-[13px]`, `pb-0` not `pb-2`

### 4. OSControlRail.tsx — Compressed rail

- `space-y-3` not `space-y-4`
- Remove description lines ("How much you can lose today", "Entries used vs. allowed")
- Risk number: `text-lg` not `text-xl`
- Trades number: `text-lg` not `text-xl`
- Progress bar: `h-1.5` not `h-2`
- Trade dots: `h-2` not `h-2.5`
- Quick action: `h-8` not `h-9`
- Session time grid: `gap-0.5` cells
- Active plan card: `p-2` not `p-2.5`

### 5. CSS — Tighter card classes (index.css)

- `vault-glass-card`: `border-radius: 10px` not `16px`, `box-shadow` reduced
- `vault-premium-card`: `border-radius: 10px` not `1.125rem`
- `vault-approval-choice-card`: `border-radius: 10px` not `1rem`, `padding: 0.625rem` not `1.25rem`

## Files Changed
1. `src/components/vault-planner/VaultTradePlanner.tsx` — `embedded` prop, compact mode
2. `src/pages/academy/AcademyTrade.tsx` — pass `embedded`, compress shell
3. `src/components/trade-os/OSTabHeader.tsx` — compact tabs
4. `src/components/trade-os/OSControlRail.tsx` — compressed rail
5. `src/index.css` — tighter card base classes

## What Does NOT Change
- All data flow, hooks, handlers, modals
- All approval calc logic
- Standalone `/academy/vault` page appearance
- Lower analytics cards

