

# Color-Code Risk % Selector Buttons

## Change

One file edit in `src/pages/academy/AcademyTrade.tsx` lines 798-803. Replace the universal blue (`primary`) active styling with per-level semantic colors:

- **1%** → Emerald green (`bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow emerald`)
- **2%** → Amber/yellow (`bg-amber-500/20 text-amber-400 border-amber-500/30 shadow amber`)
- **3%** → Rose/red (`bg-rose-500/20 text-rose-400 border-rose-500/30 shadow rose`)

This matches the existing semantic color system (green = safe, amber = caution, red = danger) and mirrors the `RiskModeSelector` pattern already used for Conservative/Standard/Aggressive.

### File: `src/pages/academy/AcademyTrade.tsx` (lines 798-803)

Replace the active-state class logic with a lookup:

```tsx
const riskColor = { 
  1: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
  2: "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]",
  3: "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
};

// Active button uses riskColor[pct], inactive stays unchanged
```

Single file, 5-line change. No other files affected.

