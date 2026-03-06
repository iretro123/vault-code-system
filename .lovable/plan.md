

## Add Card-Level Help Icons to Trade Planner

Small, surgical addition of one help icon per panel card — no clutter, no redesign.

### Changes to `src/components/vault-planner/VaultTradePlanner.tsx`

**1. Update `PanelCard` component** (lines 44–54)

Add an optional `help` prop (string content). When provided, render a small `HelpCircle` icon (14px) at the top-right of the card header, using the existing `XPTooltip` component with `white` mode for a premium popover feel.

Header becomes a flex row: title left, help icon right.

**2. Pass help content to each panel**

- **Account** panel (line 334): help text =
  `"Account Size — your total trading account balance\nRisk per trade — max loss if your stop gets hit\nBest premium zone — healthiest 1-contract premium range\nStretch zone — more aggressive premium range\nMax stop width — most stop room allowed for 1 contract"`

- **Trade** panel (line 398): help text =
  `"Buy Price — the option premium you plan to enter at\nStop Price — where you plan to exit if wrong\nBest zone — this premium fits your account comfortably\nStretch zone — this premium is more aggressive\nSuggested stop — keeps risk inside your rules"`

- **Results** panel (line 464): help text =
  `"Contracts to Buy — how many your account allows\nPlanned Loss — estimated loss if you stop out\nMoney Needed — total cost to open the trade\nMain Target — 1:2 risk/reward target\nTP1 / TP2 — early and extended profit ideas"`

**3. Keep existing inline tooltips only on these 3 fields** (already correct):
- Account Size (line 335)
- Option Buy Price (line 405)
- Option Stop Price (line 431)

No other inline help icons added.

**4. Import** — add `HelpCircle` to the lucide-react import (line 20).

### Files
- `src/components/vault-planner/VaultTradePlanner.tsx` — ~15 lines changed

