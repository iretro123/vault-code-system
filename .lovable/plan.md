

## Root Cause

The `has_role()` database function — used by every RLS policy on `stripe_webhook_events`, `students`, `student_access`, and other admin tables — has a **subscription gate** that silently blocks your operator role:

```sql
-- Current has_role() logic:
SELECT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = _user_id
    AND role = _role
    AND (subscription_status = 'active' OR role = 'free')  -- ← THE BUG
)
```

Your `user_roles` row has `role = 'operator'` but `subscription_status = 'none'`. Since `'operator' != 'free'` and `'none' != 'active'`, `has_role()` returns **false**. Every RLS policy gating admin reads fails silently, returning empty arrays instead of data.

The webhook edge function uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS), so writes succeed — data IS in the database (3 events confirmed). But client-side reads return nothing.

## Fix

### 1. Patch `has_role()` function (migration)

Update the function to also bypass the subscription check for privileged roles (`operator`):

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        subscription_status = 'active'
        OR role = 'free'
        OR role = 'operator'
      )
  )
$$;
```

### 2. Add debug logging in `AdminStripeTab` (temporary)

Add `console.info` after each query in `fetchData` to log counts and any errors:

```typescript
console.info("[AdminStripeTab] students:", studentsRes.data?.length, studentsRes.error);
console.info("[AdminStripeTab] access:", accessRes.data?.length, accessRes.error);
console.info("[AdminStripeTab] events:", eventsRes.data?.length, eventsRes.error);
```

### 3. Add warning banner if access exists but no events

In the existing stats section, if `students.length > 0` and `accessRecords.some(a => a.status === 'active')` but `webhookEvents.length === 0`, show a small amber warning: "Access was granted but no webhook events found — check webhook logging."

### No other changes
- No Stripe/webhook code changes
- No UI redesign
- No plan mapping changes

### After fix
`has_role()` will return `true` for operator, all RLS-gated queries will return data, and the stats + recent events table will populate immediately on refresh.

