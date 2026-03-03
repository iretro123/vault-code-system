

## Fix: Whop Email Verification Bug

### Problem
The Whop `/v2/memberships` API **ignores the `email` query parameter** and returns ALL memberships. So `memberships.length > 0` is always true — every email (including fake ones) gets `found: true`.

The logs confirm this: `m0348aa418a@gmail.caom` (clearly fake) returned "Found in Whop."

### Fix: `check-stripe-customer/index.ts`

Replace the current Whop check (lines 49-77) with paginated fetching + server-side email matching:

1. **Fetch all Whop memberships** in pages of 50 (cap at 500 total to prevent runaway loops)
2. **For each membership**, compare `m.email` and `m.user?.email` against the input email (case-insensitive)
3. **If a match is found**, check `m.valid` and `m.status`:
   - `valid === true` and status is `active`, `trialing`, or `completed` → return `{ found: true, source: "whop", status: "active" }`
   - `valid === false` or status is `canceled`, `past_due`, etc. → return `{ found: true, source: "whop", status: "canceled" }`
4. **If no match found after all pages** → return `{ found: false }`

```text
Current (broken):
  Any email → Whop API (ignores email param) → returns all → length > 0 → ✅ ALWAYS

Fixed:
  Email → paginate all memberships → match email server-side → check status
    → active/trialing/completed → found: true, status: "active"
    → canceled/past_due         → found: true, status: "canceled"  
    → no match                  → found: false
```

### Fix: `Auth.tsx` (frontend)

Update the signup gate to handle the new `status` field:

1. Add a new state: `"canceled"` to `stripeStatus`
2. When response has `found: true` and `status === "canceled"` → show "Your membership is canceled or expired. Please renew to create an account."
3. When `found: true` and `status === "active"` → green check, allow signup
4. When `found: false` → red X, block signup (existing behavior)
5. Fake emails → `found: false` → correctly blocked

### Changes
- **Edit**: `supabase/functions/check-stripe-customer/index.ts` — paginated Whop fetch + email match + status reporting
- **Edit**: `src/pages/Auth.tsx` — handle `canceled` status with appropriate UI message
- **Deploy**: `check-stripe-customer` edge function

