

# Add "Update Balance" to TrackedBalanceCard

## Problem
Users can only reset their balance (which clears it entirely). They need a way to **correct/update** their current starting balance without resetting everything — e.g., if they deposited/withdrew funds or the number drifted.

## Changes

### `src/pages/academy/AcademyTrade.tsx` — TrackedBalanceCard enhancement

Add an "Update Balance" inline form to the `TrackedBalanceCard`:

1. Add a toggle state `showUpdateBalance` alongside the existing `showResetConfirm`
2. Add a pencil/edit icon button next to "Balance Management" header that reveals an inline input
3. The input pre-fills with the current `trackedBalance` value (starting + P/L)
4. On save: updates `profiles.account_balance` to the new value, calls `setStartingBalance()` with the new value, and triggers `refetch()` on trade entries so the HUD recalculates
5. The existing Reset flow stays untouched

**TrackedBalanceCard** gets two new props: `onUpdateBalance: (newBalance: number) => void` and `trackedBalance: number` (for pre-fill).

**Parent component** gets a new handler `handleUpdateBalance` that:
- Updates `profiles.account_balance` with the new value minus `totalPnl` (so that `startingBalance + totalPnl = newBalance`)
- Calls `setStartingBalance(newValue - totalPnl)`
- Shows toast confirmation

This way the user says "my real balance is $26,500" and the system back-calculates the correct starting balance to make the math work with existing logged trades.

### Move TrackedBalanceCard higher

Move it from after the Trade Journal to **right after the Equity Curve** section, so users can find it easily.

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Add update balance form to TrackedBalanceCard, add handler, move card up in render order |

