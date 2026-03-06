

## Upgraded Reset Button + Auto-Clear on Logout/Tab Close

### Problem
1. The current "Reset" button is a tiny inline `Btn` that blends in with the other action buttons — easy to miss.
2. When a user logs out or closes the tab, the planner data persists in `localStorage` (`vault_trade_planner_inputs`), so the next user (or same user returning) sees stale trade data.

### Solution

#### 1. Prominent Reset Button
- Pull the Reset button OUT of the inline action row and place it as a **standalone full-width button** at the very top of the Trade panel (or bottom of the entire planner), styled distinctly:
  - Full-width on mobile, right-aligned on desktop
  - Outlined/ghost style with a `RotateCcw` icon + "Reset All" label
  - Subtle red-tinted hover state to signal destructive action
  - Slightly larger text than the tiny `Btn` components
- Remove the old inline `<Btn onClick={handleReset}>Reset</Btn>` from the action row to avoid duplication.

#### 2. Auto-Clear on Logout
- Add a `useEffect` in `VaultTradePlanner` that listens to `supabase.auth.onAuthStateChange`. On `SIGNED_OUT` event, call `localStorage.removeItem(STORAGE_KEY)` and run `handleReset()`.

#### 3. Auto-Clear on Tab Close
- Add a `useEffect` with a `beforeunload` listener that removes `STORAGE_KEY` from localStorage. This ensures closing the tab wipes the planner data.

### Files Changed
- `src/components/vault-planner/VaultTradePlanner.tsx` — add reset button UI, add two `useEffect` hooks (auth listener + beforeunload), remove old inline reset button, import `RotateCcw` icon and `supabase` client.

