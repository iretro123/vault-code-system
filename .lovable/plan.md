

## Fix: App Flashing / Blue Screen When Returning to Tab

### What's Happening

When you leave the Vault tab for 60+ seconds and come back, three things fire simultaneously:

1. **`useSmartRefresh`** invalidates every single query in the app at once and shows a "Syncing..." toast
2. All those queries go into loading state, which causes components to show spinners/skeletons
3. The dark blue ambient background shows through while content reloads — creating the "blue flash"

The VaultStateContext also resets its loading flag during background refreshes, which can cascade into full-screen loading screens.

### Fix Plan

**1. Rewrite `useSmartRefresh` to be gentle (src/hooks/useSmartRefresh.ts)**
- Instead of `queryClient.invalidateQueries()` (which marks ALL queries stale and refetches everything at once), use `queryClient.refetchQueries({ type: 'active' })` which silently refetches only mounted queries without resetting their cached data
- Remove the "Syncing..." toast — users don't need to see this
- Increase threshold from 60s to 5 minutes — 60s is too aggressive

**2. Fix VaultStateContext background refresh (src/contexts/VaultStateContext.tsx)**
- Never set `loading: true` on a background refetch — only show loading on the very first fetch when there's no data yet
- The `refreshing` flag already exists for this purpose but the condition is wrong

**3. Prevent AcademyLayout full-screen flash (src/components/layout/AcademyLayout.tsx)**  
- The layout shows a full-screen spinner whenever `!hydrated` (line 96). During a smart refresh, if `hydrated` briefly flips, the entire UI disappears and shows a spinner over the dark blue background
- Fix: once hydrated is true, never show the loading screen again in that session — use a ref to track "was ever hydrated"

### Technical Detail

```text
Before (tab return):
  useSmartRefresh → invalidateQueries() → ALL data = stale
    → loading spinners everywhere → blue background visible → "Syncing..." toast
    → 200-500ms later: data arrives → UI re-renders

After (tab return):  
  useSmartRefresh → refetchQueries({ type: 'active' }) → data updates silently
    → UI stays rendered with old data → new data swaps in seamlessly
    → no toast, no flash, no spinners
```

### Files

| File | Change |
|------|--------|
| `src/hooks/useSmartRefresh.ts` | Use `refetchQueries` instead of `invalidateQueries`, remove toast, increase threshold to 5 min |
| `src/contexts/VaultStateContext.tsx` | Never set `loading: true` during background refetches |
| `src/components/layout/AcademyLayout.tsx` | Use a ref so once hydrated, never show the loading screen again |

