

## Problem Diagnosis

There are **two critical bugs** causing the reset page to never appear:

### Bug 1: Competing recovery tokens
`Auth.tsx` calls `resetPasswordForEmail()` (generates token #1, sends standard email), then ALSO calls the `ghl-password-reset` edge function which calls `admin.generateLink()` (generates token #2, invalidating token #1). Whichever email the user clicks, there's a 50/50 chance the token is already invalidated.

### Bug 2: Broken `redirectTo` in GHL function
The GHL function builds its `redirectTo` as:
```
Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") + "/reset-password"
```
This produces a garbage URL like `https://oemylhcjqncovnmvvgxh/reset-password` — not a valid app URL. So even if the GHL link's token is valid, the redirect goes nowhere useful.

### Bug 3: No fallback detection in ResetPassword.tsx
The page only listens for the `PASSWORD_RECOVERY` auth state event. If the event fires before the component mounts (race condition), or if the session was already established during redirect, the page stays stuck on "Verifying your reset link…" forever.

---

## Plan

### 1. Eliminate competing tokens — single source of truth
- **Remove** `resetPasswordForEmail()` from `Auth.tsx`
- Let the `ghl-password-reset` edge function be the sole generator via `admin.generateLink()`
- Pass the app's `origin` URL from the client so the function can build the correct `redirectTo`

### 2. Fix `redirectTo` in `ghl-password-reset/index.ts`
- Accept `origin` from the request body (e.g. `https://vault-code-system.lovable.app`)
- Set `redirectTo` to `${origin}/reset-password`
- This ensures the recovery link redirects to the correct page

### 3. Make ResetPassword.tsx more resilient
- On mount, also check if there's an existing session and if the URL hash contains `type=recovery`
- If session exists (meaning the recovery token was already consumed during redirect), immediately show the password form instead of waiting for an event that already fired

### Files to change

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Remove `resetPasswordForEmail`, pass `origin` to GHL function |
| `supabase/functions/ghl-password-reset/index.ts` | Accept `origin` param, fix `redirectTo` |
| `src/pages/ResetPassword.tsx` | Add session-based fallback detection |

