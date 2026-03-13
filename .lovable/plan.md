

# Compact Hero Card + Smart Auto-Select

## Problem
The Hero Decision Card is too tall — Status + Details + R:R Visualizer (3 cards) + Summary Row + Broker Guide (3 steps) + Coaching Note + CTA = massive vertical scroll. The R:R section alone is ~300px.

## Solution

### 1. Collapsible R:R Section
The R:R Visualizer + Broker Guide become a **collapsible section** inside the Hero Decision Card — collapsed by default, showing a compact 1-line summary:

```text
┌──────────────────────────┐
│        FITS              │
│  Buy 2 contracts         │
│  Exit if wrong   $0.42   │
│  Cash needed    $240     │
│  Max loss       $156     │
├──────────────────────────┤
│  R:R  1:2 → +$312  ▼    │  ← collapsed: tappable to expand
├──────────────────────────┤
│  ✨ Coaching note        │
│  [Use This Plan →]       │
└──────────────────────────┘
```

When expanded, shows the full 3 ratio cards + summary + broker guide. This cuts ~250px from default view.

**Implementation:** Wrap the R:R Visualizer in a `Collapsible` with a compact trigger row showing selected ratio + profit preview. `RiskRewardVisualizer` stays unchanged — just wrapped.

### 2. Smarter Auto-Select
The `useEffect` at line 165 already auto-selects the recommended choice. Two improvements:
- When `contractPrice` changes and `result` recalculates, auto-select fires. Add a brief visual pulse/highlight on the selected card to make it obvious.
- If only ONE choice fits (others are "pass"), select it immediately without needing "Best" badge logic.

## Files Changed
1. **`src/components/vault-planner/VaultTradePlanner.tsx`** — Wrap R:R section in `Collapsible` inside `HeroDecisionCard`, add compact trigger row, improve auto-select logic
2. **`src/components/vault-planner/RiskRewardVisualizer.tsx`** — No changes (stays as-is, just wrapped)

## What Does NOT Change
- All approval calc logic
- Plan save/replace pipeline
- R:R Visualizer component internals
- Contract choice cards
- Standalone mode appearance

