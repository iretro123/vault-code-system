

# Plan: Premium Visual Upgrade for Trading OS Layout

## Problem
The current OS layout is structurally correct (tabs, metrics strip, hero card) but visually identical to the old layout — just the same components shuffled into tabs. It doesn't match the premium, Robinhood-inspired mockup at all.

## What Needs to Change

### 1. Greeting Header — make it premium
- Larger, bolder typography (`text-2xl md:text-3xl`)
- Status line with a subtle animated dot for active session
- Remove cramped spacing, add breathing room

### 2. Metrics Strip — match the mockup's compact luxury feel
- Larger balance number as hero number (`text-xl md:text-2xl font-bold`)
- Cleaner cell separation with subtle dividers
- P/L color-coded (green/red) with larger weight
- The `+ Log Trade` button as a premium pill CTA on the right
- On mobile: horizontal scroll or 2-row compact layout

### 3. Hero OS Card — the main upgrade
- Larger card with more padding (`p-5 md:p-8`)
- Tab header styled as premium pill-style tabs with subtle background highlight on active
- Active tab content has more visual breathing room
- Plan tab: embed VaultTradePlanner directly (not just a "Check a Trade" link to another page)
- Each tab's empty state should have premium, clear messaging

### 4. Lower Analytics — quieter
- Reduce visual weight: smaller section label, tighter cards
- Slightly muted borders compared to hero card

### 5. Mobile polish
- Larger balance hero treatment
- Tab icons more prominent
- Single dominant CTA always visible

## Files to Change

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Restyle OS layout section: larger greeting, premium metrics strip, better hero card padding, embed VaultTradePlanner in Plan tab |
| `src/components/trade-os/OSTabHeader.tsx` | Restyle tabs to premium pill/underline style with better spacing and icons |

## Files NOT Touched
All hooks, all extracted components, all existing logic, all modals, classic layout fallback, database, edge functions.

## Key Visual Changes (Code-Level)

**Greeting**: `text-2xl md:text-3xl font-bold tracking-tight` with larger status line

**Metrics Strip**: Each cell gets `py-3 md:py-4`, balance gets `text-lg md:text-xl`, clean `border-r border-border/20` dividers

**Hero Card**: `rounded-2xl border border-primary/10 bg-card` with `p-5 md:p-8` inner padding. Tab header gets a subtle background bar. Active tab gets blue underline or background pill.

**Plan Tab**: Directly embed `<VaultTradePlanner />` so users don't leave the page. Keep `TodayVaultCheckCard` for active plan status.

**Tab Header**: Pill-shaped active state with `bg-primary/10 text-primary` instead of just an underline. Completed tabs show a green dot. Better mobile sizing.

## Implementation Scope
This is a visual-only upgrade to the existing OS layout code. No new components needed. No data changes. No hook changes. Just restyling the JSX that's already there and embedding VaultTradePlanner in the Plan tab.

