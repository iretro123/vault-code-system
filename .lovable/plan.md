

## Plan: Fix user deletion — block login for kicked/banned users

### Problem
Two issues:
1. **Users can still log in** after being kicked/banned — the current kick/ban only sets `profiles.access_status = "revoked"` but nothing prevents them from authenticating via the auth system.
2. **Users may still appear in the list** if there's a timing issue or the filter isn't catching properly.

### Root cause
The auth system (`useAuth.tsx`) fetches the profile after login but never checks if `access_status === "revoked"` or `is_banned === true`. It happily loads the session and redirects to `/hub`. The `AcademyLayout` shows an "Access Revoked" screen, but the user is still fully authenticated and can access non-academy routes.

### Solution

**1. Block banned/revoked users at login (`src/hooks/useAuth.tsx`)**
- In `fetchUserData`, after fetching the profile, check if `access_status === "revoked"` or `is_banned === true`.
- If so, immediately call `supabase.auth.signOut()` and clear state. The user gets kicked out of the session entirely.
- This means banned/revoked users cannot maintain an active session.

**2. Block banned/revoked users on the login form (`src/pages/Auth.tsx`)**
- After successful `signIn`, fetch the profile and check `access_status` / `is_banned` before navigating.
- If revoked/banned, sign them out immediately and show a toast: "Your access has been revoked."

**3. Also revoke `student_access` on kick/ban (`src/components/admin/AdminMembersTab.tsx`)**
- When kicking or banning, also update `student_access` to `status = 'canceled'` for that user so the access gate (`get_my_access_state`) returns no access even if they somehow get past the auth block.

### Files
1. `src/hooks/useAuth.tsx` — auto-signout for revoked/banned profiles
2. `src/pages/Auth.tsx` — post-login check before navigation
3. `src/components/admin/AdminMembersTab.tsx` — also revoke `student_access` on kick/ban

