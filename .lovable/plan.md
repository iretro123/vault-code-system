

## Fix: App Stuck at Loading Screen

### Root Cause

When a user's refresh token expires (confirmed in auth logs: `refresh_token_not_found`), the app enters an unrecoverable loading state:

1. `getSession()` returns a stale session from localStorage (Supabase doesn't validate tokens on `getSession`)
2. `user` gets set to the stale user object
3. `fetchUserData()` tries to query `profiles` table — fails silently (401 or returns null due to expired JWT)
4. `profile` stays `null`, `loading` becomes `false`
5. AcademyLayout checks: `profileReady = !loading && !!user && !!profile` → **false forever**
6. The spinner shows indefinitely — no redirect to auth, no recovery

### Fix

**File: `src/hooks/useAuth.tsx`** — lines 120-180

In `fetchUserData`, after the profile query, if `profileData` is null (no profile returned):
1. Attempt `supabase.auth.refreshSession()` to get a fresh token
2. If refresh succeeds, retry the profile query once
3. If refresh fails OR retry still returns null, sign out the user cleanly (clears stale tokens, redirects to /auth)

This ensures expired sessions never leave users stuck — they either recover silently or get redirected to login.

```typescript
async function fetchUserData(userId: string) {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // If profile fetch failed or returned null, try refreshing the session
    if (!profileData) {
      console.warn("[Auth] No profile data — attempting session refresh");
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn("[Auth] Session refresh failed — signing out", refreshError.message);
        await signOutCleanup();
        return;
      }
      // Retry profile fetch with fresh token
      const { data: retryData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!retryData) {
        console.warn("[Auth] Profile still null after refresh — signing out");
        await signOutCleanup();
        return;
      }
      // Use retry data (fall through to existing profile handling)
      handleProfile(retryData, userId);
    } else {
      handleProfile(profileData, userId);
    }
    // ... rest of role fetching stays the same
  } catch (error) {
    console.error("Error fetching user data:", error);
    // On unexpected errors, also attempt recovery
    await signOutCleanup();
  } finally {
    setLoading(false);
  }
}
```

The `signOutCleanup` helper consolidates the sign-out + state clearing logic that's already duplicated in multiple places.

### Impact on Existing Users
- Users with valid sessions: zero change — profile query succeeds on first try, skip recovery
- Users with expired tokens: automatically recover (refresh works) or get cleanly redirected to login (refresh fails)
- No UI changes, no new routes, no database changes

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add session recovery logic in `fetchUserData` when profile is null |

