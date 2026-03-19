

## Stress Test Results: Login & Signup Auth Flows

After reviewing `Auth.tsx`, `Signup.tsx`, `useAuth.tsx`, `ensureProfile.ts`, and `ResetPassword.tsx`, here are the issues found and the fixes needed.

---

### Issues Found

**1. Missing `DialogTitle` in agreement modal (console error)**
The agreement modal in Signup.tsx uses `DialogContent` without a `DialogTitle`, causing a Radix accessibility error visible in console logs. This can cause screen readers to break and on some mobile browsers interfere with focus management.

**2. Signup navigates to `/academy` even when no session exists**
After `signUp()`, if email confirmation is required, `getSession()` returns null. The code still calls `navigate("/academy")` (line 189) regardless. The user lands on the academy page with no session, gets bounced by AuthGate, creating a confusing flash. Profile and agreement are silently skipped since `newUserId` is null.

**3. Race condition / duplicate ban check on login**
`Auth.tsx` manually calls `supabase.auth.getUser()` then queries profiles for ban status after `signIn()`. Meanwhile, `useAuth`'s `onAuthStateChange` listener fires simultaneously and does the exact same ban check. This is a race: the Auth page could navigate to `/academy` before `useAuth` finishes its ban check and signs the user out, causing a brief flash of authenticated content.

**4. Login button stays enabled during async ban check**
After `signIn()` succeeds, `loading` is not set back to true during the getUser/profile check (lines 42-55). A user could interact with the page during this window.

**5. `check-stripe-customer` is unauthenticated + no rate limit**
The membership verification endpoint has `verify_jwt = false` and is called on every email keystroke (debounced 600ms). This enables email enumeration attacks. Low priority but worth noting.

---

### Fix Plan

**File: `src/pages/Signup.tsx`**

1. **Add hidden `DialogTitle`** for accessibility — import `DialogTitle` from Radix and add a visually hidden title inside the modal.

2. **Handle missing session after signup** — After `signUp()` succeeds, check if `getSession()` returns a session. If not (email confirmation required), show a "Check your email" toast and do NOT navigate. Only proceed with profile creation, agreement, provisioning, and navigation when a session exists.

**File: `src/pages/Auth.tsx`**

3. **Remove duplicate ban check** — The `useAuth` hook already checks ban/revoked status in `fetchUserData` and signs out if detected. Remove the redundant manual `getUser()` + profile query from Auth.tsx to eliminate the race condition. Let `useAuth`'s listener handle it. Simply navigate on successful `signIn()`.

4. **Simplify login flow** — After `signIn()` returns no error, toast + navigate. The `useAuth` listener handles the rest (profile fetch, ban enforcement).

---

### Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `Signup.tsx` | Add `DialogTitle` (visually hidden) | Fix console error + accessibility |
| `Signup.tsx` | Gate post-signup logic on session existence | Prevent ghost navigation when email confirm is on |
| `Auth.tsx` | Remove manual getUser + ban check after signIn | Eliminate race condition with useAuth listener |

No database changes needed. No changes to `useAuth.tsx` (its ban check is the correct single source of truth).

