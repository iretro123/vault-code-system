

## Plan: Auto-provision access for manually whitelisted users

### Problem
When an admin adds a user via "Add User", only an `allowed_signups` row is created. After the user signs up, the access check (`get_my_access_state` RPC) queries `students` → `student_access` and finds nothing, so access = "none" and everything is locked.

Stripe-provisioned users get these rows via the webhook. Manually added users bypass Stripe, so they never get provisioned.

### Solution
After a whitelisted user signs up, automatically create their `students` + `student_access` rows. This is done via a new edge function called from the signup flow. If a Stripe customer ID was attached to the whitelist entry, it's carried over — so if their subscription later fails, the normal Stripe webhook flow handles downgrades as usual.

### Changes

**1. New edge function: `supabase/functions/provision-manual-access/index.ts`**
- Called with `{ email, auth_user_id }` using service role key (no JWT needed — called right after signup)
- Looks up the email in `allowed_signups` where `claimed = true`
- If found and no `students` row exists for that `auth_user_id`:
  - Inserts a `students` row (with `stripe_customer_id` from `allowed_signups` if present)
  - Inserts a `student_access` row with `status = 'active'`, `product_key = 'vault_academy'`, `tier = 'elite_v1'`
- If a `students` row already exists, skips (idempotent)
- If Stripe customer ID is present, the access row includes it — meaning the Stripe webhook can later update/downgrade this user's access normally

**2. Update `src/pages/Signup.tsx`**
- After profile creation + whitelist claim, call the new edge function
- Pass `{ email, auth_user_id }` so it can provision access

**3. Update `supabase/config.toml`**
- Register the new function with `verify_jwt = false`

### How Stripe integration stays intact
- If the admin linked a Stripe customer ID, the `student_access` row carries it. The Stripe webhook can match and update status (past_due, canceled) as normal.
- If no Stripe ID was linked, the user has permanent "active" access (manual grant) until an admin changes it.

### Files
1. `supabase/functions/provision-manual-access/index.ts` (new)
2. `src/pages/Signup.tsx` (add provisioning call after signup)
3. `supabase/config.toml` (register function)

