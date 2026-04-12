

## Fix: Input State Loss on Tab Switch & Navigation

### Root Causes Found

**Problem 1: `onAuthStateChange` fires `TOKEN_REFRESHED` every time you return to the tab**
In `useAuth.tsx` (line 130), every auth event — including `TOKEN_REFRESHED` which fires automatically when you switch back to the browser tab — triggers `ensureProfile()` + `fetchUserData()`. This calls `setProfile(profileData)` with a new object reference, which cascades re-renders through the entire component tree since `profile` is in React context. Every child component that reads `useAuth()` re-renders, and components using local `useState` (like AdminBroadcastTab's `title`, `body`, `userId` fields) get unmounted and remounted because their parent re-renders with a new context value, causing React to tear down and rebuild the subtree.

**Problem 2: `fetchUserData` always creates new object references**
Even when the profile data hasn't changed, `setProfile(profileData)` sets a brand new object every time. React sees a different reference → context consumers re-render → forms lose state.

**Problem 3: Double initialization race**
Both `getSession()` (line 142) and `onAuthStateChange` (line 113) fire on mount. The `onAuthStateChange` callback runs `ensureProfile` + `fetchUserData` even for the initial `INITIAL_SESSION` event, duplicating the work already done by `getSession()`. This causes two profile fetches on every page load and two rounds of context updates.

**Problem 4: `AcademyDataContext` refetches cascade**
When `user` reference changes (from the auth re-render), all `useCallback` functions with `[user]` dependencies in `AcademyDataContext` get recreated, triggering their `useEffect` watchers to refetch inbox, notifications, onboarding — more state updates, more re-renders.

### Fix Plan

#### 1. Guard `onAuthStateChange` against redundant `TOKEN_REFRESHED` events
**File: `src/hooks/useAuth.tsx`**
- Skip `fetchUserData` when the event is `TOKEN_REFRESHED` and we already have a profile for the same user ID
- Only run `ensureProfile` + `fetchUserData` for `SIGNED_IN` and `INITIAL_SESSION` events (or when user ID changes)
- This is the single biggest fix — it stops the cascade that kills form inputs

```typescript
// Before (line 113-139):
async (event, newSession) => {
  // runs fetchUserData on EVERY event including TOKEN_REFRESHED
  setTimeout(async () => {
    await ensureProfile(newSession.user.id, newSession.user.email);
    fetchUserData(newSession.user.id);
  }, 0);
}

// After:
async (event, newSession) => {
  if (event === "PASSWORD_RECOVERY") { ... }
  setSession(newSession);
  setUser(newSession?.user ?? null);

  if (newSession?.user) {
    // Skip refetch on TOKEN_REFRESHED if we already have this user's profile
    const alreadyLoaded = profile?.user_id === newSession.user.id
      || (profile as any)?.id === newSession.user.id;
    if (event === "TOKEN_REFRESHED" && alreadyLoaded) return;

    // Only fetch for SIGNED_IN, INITIAL_SESSION, or user change
    setTimeout(async () => {
      await ensureProfile(newSession.user.id, newSession.user.email);
      fetchUserData(newSession.user.id);
    }, 0);
  } else { ... }
}
```

#### 2. Use shallow equality check in `setProfile` to prevent unnecessary re-renders
**File: `src/hooks/useAuth.tsx`**
- In `handleProfile`, compare incoming data with current profile before calling `setProfile`
- Only update state if actual values changed

```typescript
// In handleProfile:
setProfile(prev => {
  if (prev && JSON.stringify(prev) === JSON.stringify(profileData)) return prev;
  return profileData as Profile;
});
```

#### 3. Prevent `getSession` + `onAuthStateChange` double-fetch race
**File: `src/hooks/useAuth.tsx`**
- Use a ref to track whether `fetchUserData` has already been called for the current user
- Skip duplicate calls from whichever handler fires second

```typescript
const fetchedForRef = useRef<string | null>(null);

// In both getSession and onAuthStateChange:
if (fetchedForRef.current === userId) return; // already fetching/fetched
fetchedForRef.current = userId;
```

#### 4. Stabilize `user` reference in `AcademyDataContext` dependencies
**File: `src/contexts/AcademyDataContext.tsx`**
- Use `user?.id` instead of `user` in `useCallback` dependency arrays to prevent callback recreation on token refresh

### Files Changed
| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Guard TOKEN_REFRESHED, shallow-equal setProfile, dedup fetch |
| `src/contexts/AcademyDataContext.tsx` | Stabilize callback deps to `user?.id` |

### Expected Result
- Switching browser tabs no longer causes form inputs to clear
- Navigating between admin panel tabs preserves typed content
- No more double profile fetches on page load
- Context re-renders only happen when actual data changes

