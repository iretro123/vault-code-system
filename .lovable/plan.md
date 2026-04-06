

## Fix: Loading Spinner Deadlock in AcademyLayout

### Root Cause

Line 74 of `AcademyLayout.tsx`:
```typescript
if (loading || !profileReady || !hydrated) { return <spinner> }
if (!user) { return <Navigate to="/auth"> }
```

`profileReady = !loading && !!user && !!profile` — when there's no user (logged out, expired session, or the new `signOutCleanup` kicks in), `profileReady` is always `false`. The spinner gate catches this BEFORE the `/auth` redirect on line 91 is ever reached. Result: infinite spinner.

### Fix

**File: `src/components/layout/AcademyLayout.tsx`** — lines 72-93

Reorder the gates so "no user" is checked right after auth loading finishes, before the profile/hydration check:

```typescript
// 1. Wait for auth to finish
if (loading) {
  return <spinner>;
}

// 2. No user → redirect immediately (don't wait for profile/hydration)
if (!user) {
  return <Navigate to="/auth" replace />;
}

// 3. User exists but profile/hydration still loading
if (!profile || !hydrated) {
  return <spinner>;
}
```

This ensures:
- Expired sessions that trigger `signOutCleanup` → user becomes null → immediate redirect to `/auth`
- Fresh logins → wait for profile + hydration → then render
- No impact on existing authenticated users (profile loads, hydrated becomes true, everything proceeds as before)

### Files

| File | Change |
|------|--------|
| `src/components/layout/AcademyLayout.tsx` | Reorder loading/auth/profile gates (lines 72-93) |

One file, ~5 lines changed. Zero risk to authenticated users.

