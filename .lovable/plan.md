

## Root Cause

In `useLiveSessions()` (lines 52-53 of `AcademyLive.tsx`), loading state is derived from `readLiveCache().length === 0`. When the cached result is an empty array (no sessions exist), this evaluates to `true`, causing the skeleton to flash on every tab return before the real "No upcoming sessions" UI appears.

The fix: check whether the cache key **exists** in localStorage, not whether the cached array has items.

## Fix

**File: `src/pages/academy/AcademyLive.tsx`**

Update the `useLiveSessions` hook (lines 51-69):

```typescript
function useLiveSessions() {
  const [sessions, setSessions] = useState<LiveSession[]>(() => readLiveCache());
  const [loading, setLoading] = useState(() => localStorage.getItem(LIVE_CACHE_KEY) === null);

  const fetch = useCallback(async () => {
    if (localStorage.getItem(LIVE_CACHE_KEY) === null) setLoading(true);
    // ... rest unchanged
```

Two changes:
1. **Line 53**: `loading` init checks if the cache key exists at all, not array length. If key exists (even with `[]`), we already have data — no loading state needed.
2. **Line 56**: Same guard inside `fetch` — only show loading on true first-ever load.

No other files affected. No visual/layout changes.

