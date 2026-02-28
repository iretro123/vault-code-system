

## Fix Learn Page Glitch — Root Cause and Solution

### Root Cause

The glitch is caused by `useAcademyPermissions` (lines 34-36 and 46):

```
loading: Boolean(user?.id),   // starts true when user exists
resolved: !user?.id,          // starts FALSE when user exists
```

Then on every mount, line 46 force-resets: `resolved: false`.

This matters because `useStudentAccess` (line 107) computes:
```
const adminBypass = permResolved && (isCEO || isOperator);
```

**On tab switch (remount):**
1. `permResolved` = `false` (reset by effect)
2. `adminBypass` = `false`
3. Cached `hasAccess` = `false` (admin has no student_access row)
4. `!hasAccess && !accessLoading` = `true` → **PremiumGate flashes briefly**
5. ~500ms later: permissions RPC resolves → `permResolved=true` → `adminBypass=true` → cards appear

The module cards "jump in" because for that brief window, PremiumGate renders instead of the course grid.

### Fix

**File: `src/hooks/useAcademyPermissions.ts`**

When a valid cache exists, initialize with `resolved: true` and `loading: false` (SWR pattern — trust the cache, refresh silently). Do NOT reset `resolved: false` on effect if cache already provided initial state.

Changes:
- Line 30-36: Initialize `resolved` and `loading` based on cache existence — if cache exists, `resolved: true`, `loading: false`
- Line 46: Only reset `resolved: false` if no cache was available at init time

This is the same SWR pattern already used by `useStudentAccess`, `useAcademyModules`, and `useLessonProgress`.

### Files to modify
- `src/hooks/useAcademyPermissions.ts` (single file, ~4 lines changed)

