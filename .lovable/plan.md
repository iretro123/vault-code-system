

# Equity Curve — Premium Robinhood-Style Upgrade

## Current State
Basic area chart with a single header row (icon + title + change %). Minimal info, no stats, generic tooltip. Looks functional but flat.

## Design

Robinhood-style equity curve with:

### Header Section
- **Large balance number** (`$12,450`) as the hero element — text-2xl font-bold tabular-nums
- **Change pill** below it: colored badge showing `+$350 (2.8%) ↑ All Time` in emerald/red
- **Time range selector**: `1W / 1M / 3M / All` — small segmented control (like Robinhood) — purely visual for now since data is all-time, but sets up the UI pattern
- Remove the small icon + "Equity Curve" title — the balance IS the title

### Chart
- Taller chart: `h-[200px] md:h-[220px]`
- Smoother curve: `type="natural"` instead of `monotone`
- Subtle animated crosshair on hover (Recharts `cursor` line)
- Gradient fill with higher opacity at top (0.4 → 0.02)
- No axis lines, no grid — pure Robinhood minimalism
- Custom tooltip: just the date and balance on a single line, no box border

### Stats Row (below chart)
A 3-column grid of key metrics:
- **High** — highest balance point
- **Low** — lowest balance point  
- **Drawdown** — max peak-to-trough %

Each: 10px uppercase label + text-sm bold value. Separated by subtle vertical dividers.

### Styling
- Card: `rounded-2xl border border-white/[0.06] bg-card` — matches the luxury fintech standard
- Inner glow gradient at top for depth

## File Changed
**`src/components/trade-os/EquityCurveCard.tsx`** — full rewrite of the component with new layout, stats computation, and styling. No other files affected.

