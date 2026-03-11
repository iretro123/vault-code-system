

# Fix: VAULT Approval Flash/Glitch on Tab Navigation

## Problem
When navigating between tabs and landing on Trading Toolkit (`/academy/resources`), the embedded VAULT Approval component briefly flashes incorrect data ($0 balance, $0 loss limit, "Micro" tier) before the real values load. This happens because:

1. The `VaultTradePlanner` renders immediately without waiting for `balanceLoaded` to be true
2. Every tab switch remounts the component, triggering a fresh data fetch cycle
3. During the ~200ms fetch window, users see a "$0 / Micro" state that snaps to real values

## Fix

**Single change in `src/components/vault-planner/VaultTradePlanner.tsx`** -- add a loading gate before the main render (after the PremiumGate check on line 229):

```typescript
if (!hasAccess && !accessLoading) return <PremiumGate status={accessStatus} pageName="VAULT Approval" />;

// ADD: prevent flash of $0 data while balance is loading
if (!balanceLoaded || accessLoading) {
  return (
    <div className="space-y-3 max-w-5xl animate-pulse">
      <div className="flex gap-2">
        <div className="h-8 w-28 rounded-lg bg-white/[0.04]" />
        <div className="h-8 w-28 rounded-lg bg-white/[0.04]" />
        <div className="h-8 w-20 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-64 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
    </div>
  );
}
```

This shows a subtle skeleton placeholder matching the rules strip + trade check card shape, preventing any flash of incorrect financial data.

## What This Fixes
- No more "$0 balance" flash when switching to Toolkit or VAULT Approval tabs
- No more "Micro" tier flash before the real tier loads
- Consistent, polished loading state that matches the existing dark UI design

