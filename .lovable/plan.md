

# Fix: Analytics Cards Hidden for Users Without Trades

## Root Cause

In `src/pages/academy/AcademyTrade.tsx` line 1181, the **entire lower analytics section** is wrapped in `{hasData && (`, where `hasData = entries.length > 0`. This means users who have set a starting balance but haven't logged trades yet see **zero** analytics cards — no tracked balance, no weekly review, no performance breakdown, nothing.

There's already a variable on line 577 — `const showMetrics = startingBalance !== null || hasData` — that was clearly designed for this purpose but is **never used**.

Individual cards already have their own guards (equity curve checks `length > 1`, performance breakdown checks `symbolStats.length > 0`), so the parent `hasData` gate is overly aggressive.

## Fix

**File:** `src/pages/academy/AcademyTrade.tsx`

**Change line 1181:** Replace `{hasData && (` with `{showMetrics && (`

This single-line change ensures:
- Users **with a balance set** see: Tracked Balance card + Weekly Review card (even before logging trades)
- Users **with trades** see: all analytics cards (equity curve, performance breakdown, recent trades, balance, weekly review)
- Users **with neither** still see the getting-started banner instead

Each child card retains its own visibility guard, so nothing renders prematurely.

