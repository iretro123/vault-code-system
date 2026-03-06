

## Fix: Allow Whitelisted Users to Self-Provision at Signup

### Problem (confirmed)
`Signup.tsx` calls `provision-manual-access` with no auth token → 401. Even with a token, new users aren't operators → 403. Provisioning never runs. No access records created. User gets blocked.

### Changes

**1. Edge Function: `supabase/functions/provision-manual-access/index.ts`**
- Add a second auth path: if the caller has a valid JWT and their `auth.uid()` matches the `auth_user_id` in the request body, allow the request WITHOUT requiring operator role
- The whitelist check (`allowed_signups` where `claimed = false`) is the security gate — only pre-approved emails can provision
- Operator path stays unchanged for admin-initiated provisioning

**2. Signup page: `src/pages/Signup.tsx`**
- After signup, get the session token and pass it as `Authorization: Bearer <token>` in the provisioning fetch call

### Security
- New users can ONLY provision themselves (uid must match request body)
- Only emails in `allowed_signups` with `claimed = false` get access
- Whitelist entry is marked `claimed = true` so it can't be replayed
- Operator path remains for admin use cases

### Files
1. `supabase/functions/provision-manual-access/index.ts`
2. `src/pages/Signup.tsx`

