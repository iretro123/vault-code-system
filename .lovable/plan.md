

## Contain Trade Planner in Single Outer Card

The current `VaultTradePlanner` already has the correct 3-column `grid-cols-1 lg:grid-cols-3` layout. The issue is the 3 panels float independently with no containing wrapper — they don't feel like one cohesive tool.

### Change: `src/components/vault-planner/VaultTradePlanner.tsx`

Wrap the header + 3-panel grid + footer microcopy inside a single outer container card with:
- Rounded corners (`rounded-2xl`), subtle border, soft shadow — matching the Vault premium card standard (`hsl(214 24% 11%)` background with `#ffffff14` border)
- A top-center blue radial glow for depth (matching existing premium card pattern)
- Generous inner padding (`p-5 md:p-8`)
- The header, grid, and footer all live inside this one card
- The 3 inner `PanelCard` components keep their current styling but with a slightly lighter or differentiated background so they read as nested panels within the outer shell (adjust border to `hsl(213 18% 22%)` for contrast against the outer card)

This is purely a wrapper change — no logic, formula, or content modifications. The grid stays `lg:grid-cols-3` for desktop side-by-side and stacks on mobile.

### Structure
```text
┌─────────────────────────────────────────────┐
│  Outer Container Card (premium dark bg)     │
│                                             │
│  ┌── Header (title/subtitle) ──┐            │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Account │ │  Trade  │ │ Results │       │
│  │         │ │         │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
│  ┌── Footer microcopy ──┐                   │
└─────────────────────────────────────────────┘
```

### Files
- `src/components/vault-planner/VaultTradePlanner.tsx` — wrap the outermost `div` in a styled container card with the premium treatment; no other changes

