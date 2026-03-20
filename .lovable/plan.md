

## Fix "Update" Button — Balance Modal Never Opens

### Root Cause
The "Update" button (line 815) calls `setShowBalanceModal(true)`, but the modal's `open` prop is:
```
open={showBalanceModal && startingBalance === null}
```
Since clicking "Update" means a balance is already set (`startingBalance !== null`), the condition is always `false` and the modal never opens.

This exists in **two places** — line 620 (mobile layout) and line 1401 (main layout).

### Fix
Change the modal `open` prop from `showBalanceModal && startingBalance === null` to just `showBalanceModal` in both locations. The modal already works for both initial set and update — `handleStartingBalanceSave` handles both cases correctly (updates profile + vault_state + refetches).

Also pre-fill the modal's input with the current balance when updating, so the user sees their existing value. This requires passing a `defaultValue` prop to `SetStartingBalanceModal`.

| File | Change |
|------|--------|
| `AcademyTrade.tsx` lines 620, 1401 | Change `open={showBalanceModal && startingBalance === null}` → `open={showBalanceModal}` |
| `SetStartingBalanceModal.tsx` | Add optional `defaultValue` prop, initialize `amount` state with it |

