

## Honest Assessment

### The data right now for `retronine82@gmail.com`:
- `allowed_signups`: `claimed = false` — provisioning **never ran**
- `students` table: **empty** — no row created
- `student_access` table: **empty** — no row created
- `profiles.access_status`: `trial` (default)
- Edge function logs: **empty** — function was never called or never deployed

---

### 3 Reasons the Previous Fix (Auth Header) IS Part of the Problem

1. **Before the fix, the provisioning call had NO auth header at all** — it was guaranteed to fail with 401 for every single signup. Any user who signed up before the fix is stuck.
2. **The edge function code was correct** — it does create `students` + `student_access` rows properly when it actually runs. The auth gate was the only barrier.
3. **The `allowed_signups.claimed` is still `false`** — proving the function never executed its logic, consistent with an auth rejection.

### 3 Reasons the Previous Fix is NOT Sufficient (Why It's Still Broken)

1. **No retry on login** — The provisioning only runs during signup (line 127 of `Signup.tsx`). If it fails once, there is NO second chance. Every subsequent login just hits `get_my_access_state`, gets nothing, and shows the block modal. The fix only helps *future* signups, not existing broken users.
2. **Possible session race condition** — `supabase.auth.getSession()` is called immediately after `signUp()`. If the session hasn't fully propagated yet (async auth state update), the JWT could be null, and the provisioning call still goes without auth.
3. **No fallback when provisioning fails silently** — The catch block on line 146 just `console.error`s. The user gets redirected to `/hub` regardless, and then `AcademyLayout` shows the block modal with no way to retry.

---

### The Real Fix (What Actually Needs to Change)

The problem is clear: **there is no retry mechanism**. Provisioning runs once during signup, and if it fails for ANY reason, the user is permanently stuck.

#### Changes:

**1. `src/hooks/useStudentAccess.ts` — Add auto-retry provisioning**
- When `fetchAccess` resolves to `status: "none"` for a logged-in user, automatically call `provision-manual-access` ONE TIME (tracked by a `useRef` flag to prevent loops)
- Use the user's current JWT and email from the profile
- If provisioning succeeds (`provisioned: true`), call `fetchAccess` again to refresh
- If it fails or returns `not_whitelisted`, do nothing — block modal shows as normal

This is the safety net that catches ALL failure scenarios: users who signed up before the fix, session race conditions, network failures, etc.

**2. No edge function changes needed** — the self-provisioning path already works correctly.

#### Why this actually solves it:
- `retronine82@gmail.com` logs in → `get_my_access_state` returns nothing → status is `"none"` → hook retries provisioning → `allowed_signups` has `claimed: false` → provisioning succeeds → access granted
- Works for every past and future user in this situation
- One-time retry per session, no infinite loops

