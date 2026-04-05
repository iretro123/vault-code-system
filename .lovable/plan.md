

## Fix: GHL Funnel Purchasers Blocked at Signup

### Root Cause
When users purchase through your GHL funnels, GHL processes the payment via your Stripe account. However, GHL may not always create a formal Stripe **Customer** object — it can process payments as one-off charges or payment intents where the email is stored on the charge/invoice, not as a searchable customer record. The current `check-stripe-customer` function only calls `customers.list?email=...`, which misses these users.

Your `GHL_API_KEY` and `GHL_LOCATION_ID` secrets are already configured. Anyone who purchased through your GHL funnel exists as a **contact** in your GHL location — so we add that as a verification source.

### Changes

**1. `supabase/functions/check-stripe-customer/index.ts`**

Add two new verification steps:

- **Step 1.5 (Stripe subscriptions search)**: After the existing customer check, use the Stripe Search API: `GET /v1/subscriptions/search?query=status:'active' AND metadata['email']:'{email}'` — but more practically, if a customer was found but we want to also catch subscriptions created without a customer lookup, search charges by `receipt_email`. This catches GHL-processed payments.

- **Step 3.5 (GHL Contacts API)**: Before the slow Whop scan, call `GET https://services.leadconnectorhq.com/contacts/search/duplicate?locationId={GHL_LOCATION_ID}&email={email}` with `Authorization: Bearer {GHL_API_KEY}` and `Version: 2021-07-28`. If a contact is found → return `{ found: true, status: "active" }`.

New verification order:
```text
1. Stripe customers by email (existing)
2. Stripe charges by receipt_email (NEW)
3. allowed_signups whitelist (existing)
4. GHL contacts API (NEW)
5. Whop members (existing fallback)
```

**2. `supabase/functions/provision-manual-access/index.ts`**

Add **PATH D** after the Stripe fallback (PATH C):

- Call the same GHL contacts API endpoint
- If contact found, provision with `source: "ghl"`
- This auto-creates the `students` + `student_access` records on signup

**3. `src/pages/Signup.tsx`**

Add support text below the "Already have an account? Sign in" line (after line 578):

```
Having issues registering? Text us +1 727-270-8738
```

Small muted text, same style as the sign-in link.

### Files Changed
- `supabase/functions/check-stripe-customer/index.ts`
- `supabase/functions/provision-manual-access/index.ts`
- `src/pages/Signup.tsx`

