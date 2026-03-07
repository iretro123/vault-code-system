

## Bug: Whop Subscribers Get Blocked After Signup

### Root Cause

The access provisioning pipeline has a critical gap for Whop users:

1. **Signup gate works** — `check-stripe-customer` correctly verifies Whop membership and shows the green checkmark, allowing signup.
2. **Provisioning fails** — After signup, `provision-manual-access` ONLY checks the `allowed_signups` whitelist table. If the user isn't manually whitelisted, provisioning returns `not_whitelisted` and no `students` + `student_access` records are created.
3. **No Whop webhook exists** — Unlike Stripe (which sends webhooks to create access), Whop has no webhook integration to automatically provision access.
4. **Result** — Whop user signs up successfully, but `get_my_access_state` returns nothing (no student record), so `useStudentAccess` resolves to `status: "none"` and `hasAccess: false`. The `AccessBlockModal` blocks them.

The auto-retry in `useStudentAccess` also calls `provision-manual-access`, which again only checks the whitelist — same dead end.

### Fix

**One change: Update `provision-manual-access` edge function** to add a Whop membership check as a fallback when the user isn't in the whitelist.

Current flow:
```text
Check whitelist → not found → return "not_whitelisted" (BLOCKED)
```

New flow:
```text
Check whitelist → not found → Check Whop API for active membership → found active → provision access
                                                                   → not found → return "not_whitelisted"
```

### Changes

| File | Change |
|------|--------|
| `supabase/functions/provision-manual-access/index.ts` | After the whitelist check fails, add a Whop API lookup (same pagination logic as `check-stripe-customer`). If the user's email matches an active Whop membership, create the `students` and `student_access` records with `product_key: "vault_academy"` and `status: "active"`, then update `profiles.access_status`. This preserves the existing whitelist path for manually added users. |

### What stays the same
- Manual whitelist flow (admin adds email → user signs up → provisioned via whitelist) — unchanged.
- Stripe webhook flow — unchanged.
- The signup page gate (`check-stripe-customer`) — unchanged; it already verifies Whop.
- `useStudentAccess` auto-retry — unchanged; it will now succeed because `provision-manual-access` will find the Whop membership.

### Security
- Self-provisioning still requires a valid JWT where the caller's `uid` matches the target `auth_user_id`.
- Operator path still works as before.
- Whop membership is verified server-side via the Whop API with the existing `WHOP_API_KEY` secret.

