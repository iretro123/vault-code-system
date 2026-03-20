

## Replace "Update" Button with Balance Adjustment Popup

### Problem
The "Update" button on the hero risk card (line 815) opens the `SetStartingBalanceModal` — a simple "set balance" form. The user wants it to instead open a popup with the **tracked balance logic** — the Add Funds / Withdraw / Reset functionality from `BalanceAdjustmentCard`.

### Solution
Create a new `BalanceAdjustmentModal` component that wraps the existing `BalanceAdjustmentCard` logic inside a `Dialog`. When the "Update" button is clicked, it opens this dialog instead of `SetStartingBalanceModal`.

### Changes

**1. New file: `src/components/trade-os/BalanceAdjustmentModal.tsx`**
- A `Dialog` that contains the same Add Funds / Withdraw / Reset UI from `BalanceAdjustmentCard`
- Props: `open`, `onOpenChange`, `balance`, `onAddFunds`, `onWithdraw`, `onReset`, `onDeleteAdjustment`, `adjustments`, `resetting`
- Reuses the exact same logic and styling from `BalanceAdjustmentCard` but rendered inside a modal overlay

**2. `src/pages/academy/AcademyTrade.tsx`**
- Add new state: `showBalanceAdjustModal` (boolean)
- Change the "Update" button (line 815) from `onClick={() => setShowBalanceModal(true)}` to `onClick={() => setShowBalanceAdjustModal(true)}`
- Render the new `BalanceAdjustmentModal` in both mobile and desktop modal sections, passing the same `onAddFunds`, `onWithdraw`, `onReset`, `onDeleteAdjustment` handlers already wired to the existing `BalanceAdjustmentCard` instances
- Keep `SetStartingBalanceModal` for first-time balance setup (when `startingBalance === null`)
- After any action in the modal (add/withdraw/reset), trigger the same refetch cascade (`vaultRefetch`, `refetchTrades`, `refetchAdjustments`)

### Flow
```text
User clicks "Update" on hero card
  → BalanceAdjustmentModal opens
  → Shows: Tracked Balance, +/- buttons, Add Funds / Withdraw forms, Reset option, adjustment history
  → On action: updates DB → refetches all data → modal stays open for further actions
  → User closes modal when done
```

