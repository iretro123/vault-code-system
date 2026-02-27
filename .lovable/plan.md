

## Root Cause

The glitch is in `usePlaybookProgress.ts` line 50: **`setLoading(true)` is called unconditionally every time `fetchAll()` runs**, even when cached data is already present and rendered. 

When you switch tabs and return to Dashboard:
1. The hook re-mounts, initializes from cache (good, no loading flash)
2. `useEffect` triggers `fetchAll()` which immediately sets `loading = true`
3. PlaybookCard switches from real content → skeleton (visible jump)
4. Fetch completes ~200ms later, sets `loading = false`
5. PlaybookCard switches skeleton → real content (second jump)

This causes the double-jump/glitch on every tab switch.

## Fix (2 lines)

**File: `src/hooks/usePlaybookProgress.ts`**

Change `fetchAll()` to only set `loading(true)` when there's no cached data. If chapters are already in state (from cache or previous mount), skip the loading flag entirely — just silently refresh in the background.

```typescript
// Line 49-50, change from:
async function fetchAll() {
    setLoading(true);

// To:
async function fetchAll() {
    if (chapters.length === 0) setLoading(true);
```

This is the stale-while-revalidate pattern already used in the other hooks (`useAcademyModules`, `useAcademyLessons`). The PlaybookCard will:
- Show cached content instantly on tab return (no skeleton flash)
- Silently refresh data in background
- Only show skeleton on true first load (empty cache)

No other files need changes. No visual/layout/design changes.

