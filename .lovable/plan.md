

## Restore Performance Breakdown Card (Always Visible)

### Changes

**File: `src/pages/academy/AcademyTrade.tsx`**

1. **Classic layout (~line 652)**: Remove `hasData && symbolStats.length > 0` gate — render unconditionally.
2. **OS layout (~line 1396)**: Remove `symbolStats.length > 0` gate — render unconditionally.

**File: `src/components/trade-os/PerformanceBreakdownCard.tsx`**

3. When both `symbolStats` and `dayStats` are empty, wrap the card content in a subtle "locked/greyed-out" style:
   - Card gets `opacity-60` with a soft overlay message: "Log trades to unlock performance insights"
   - The tab switcher and empty rows still render but are muted
   - A small lock icon or dashed-border placeholder gives it a premium "coming soon" feel

This keeps the card always visible, showing users what's coming while looking intentional rather than broken.

