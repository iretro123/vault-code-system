

## Plan: Admin "Add User" with Optional Stripe Linking

### Problem
Currently, new users can only sign up if their email exists in Stripe or Whop. There's no way for an admin to pre-authorize an email that isn't yet in either billing system.

### Solution
Create an `allowed_signups` table that acts as a whitelist. The `check-stripe-customer` edge function will check this table as a third source (after Stripe and Whop). Admins can add emails from the Members tab, optionally pairing a Stripe customer ID for billing tracking.

### Database Changes

**New table: `allowed_signups`**
```sql
CREATE TABLE public.allowed_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  stripe_customer_id text,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.allowed_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can manage allowed signups"
  ON public.allowed_signups FOR ALL
  USING (has_role(auth.uid(), 'operator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role));
```

### Edge Function Change

**`supabase/functions/check-stripe-customer/index.ts`** — After Stripe check and before Whop check, query `allowed_signups` table for the email. If found and not yet claimed, return `{ found: true, status: "active" }`. This lets the user pass the signup gate.

### Frontend Changes

**`src/components/admin/AdminMembersTab.tsx`** — Add an "Add User" button next to "Export CSV". Clicking opens a dialog/sheet with:
- Email field (required)
- Stripe Customer ID field (optional, with helper text: "Paste from Stripe dashboard to link billing")
- Submit button that inserts into `allowed_signups`
- On success, toast confirmation with the email

**`supabase/functions/check-stripe-customer/index.ts`** — After successful signup, mark the `allowed_signups` row as `claimed = true` (done in the Signup page after account creation).

**`src/pages/Signup.tsx`** — After successful account creation, call an update to mark `allowed_signups.claimed = true` for that email (via the edge function or directly).

### Files to modify
1. **SQL migration** — Create `allowed_signups` table
2. **`supabase/functions/check-stripe-customer/index.ts`** — Add allowed_signups lookup
3. **`src/components/admin/AdminMembersTab.tsx`** — Add "Add User" button + dialog
4. **`src/pages/Signup.tsx`** — Mark allowed signup as claimed after registration

