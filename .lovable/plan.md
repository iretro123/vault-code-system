

## Plan: Stripe Customer Search in Add User Dialog

### Problem
The "Add User" dialog currently has a manual text field for Stripe Customer ID. You want to search Stripe customers by name/email and pick from results instead.

### Solution
Replace the manual Stripe ID input with a search-and-select component that queries Stripe's customer API via an edge function.

### Changes

**1. New edge function: `supabase/functions/search-stripe-customers/index.ts`**
- Accepts `{ query: string }` (min 3 chars)
- Uses `stripe.customers.search()` with the query against name and email
- Returns `{ customers: [{ id, name, email }] }` (max 10 results)
- Requires valid JWT + operator role check

**2. Update `src/components/admin/AdminMembersTab.tsx`**
- Replace the Stripe Customer ID text input with a search field
- On typing (debounced 400ms, min 3 chars), call the edge function
- Show a dropdown list of matching Stripe customers (name + email + ID)
- Clicking a result sets the `stripe_customer_id` value
- Show selected customer as a chip with an X to clear
- Keep the rest of the Add User form unchanged

### Files
1. `supabase/functions/search-stripe-customers/index.ts` (new)
2. `src/components/admin/AdminMembersTab.tsx` (update Add User dialog)

