

## Fix Registration: Stripe-Gated Signup + Auto-Confirm

### The Problem
Signup requires email verification but no emails are sent. Users are stuck.

### The Solution
Two changes:

**1. Enable auto-confirm (auth config change)**
Use `configure-auth` to set `double_confirm_email = false` and `enable_signup = true`. This removes the email verification requirement entirely.

**2. Create a `check-stripe-customer` edge function**
A lightweight edge function that takes an email and checks if a matching Stripe customer exists. Returns `{ found: true/false }`. This runs **before** the signup form submits — no auth token needed, just the email.

**3. Update `Auth.tsx` signup flow**
- After the user types their email in signup mode, call the `check-stripe-customer` function
- If found: show a green "User found" badge next to email, allow signup to proceed
- If not found: show a red error "This email is not registered with Vault Academy. Contact support." and **block** the Create Account button
- On successful signup: navigate to `/hub` immediately (remove "check your email" toast)
- On successful login: already navigates to `/hub` (no change needed)

### Technical Details

**Edge function: `supabase/functions/check-stripe-customer/index.ts`**
- `verify_jwt = false` (unauthenticated — runs before signup)
- Accepts `POST { email }`, uses `STRIPE_SECRET_KEY` to call `stripe.customers.list({ email, limit: 1 })`
- Returns `{ found: true }` or `{ found: false }`

**Auth.tsx changes:**
- Add `stripeStatus` state: `"idle" | "checking" | "found" | "not_found"`
- Debounced effect on email in signup mode → calls the edge function
- Show status indicator next to email field (similar to username check)
- Block submit when `stripeStatus === "not_found"`
- After successful signup, `navigate("/hub")` instead of showing verification toast

**Config update:**
- `double_confirm_email = false`, `enable_signup = true`

