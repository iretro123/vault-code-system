

## Plan: Add Test Checkout Button to Stripe Admin Tab

### What will be added

1. **"Run Test Checkout" button** at the top of `AdminStripeTab`, inside the existing test flow note card. Clicking it:
   - Gets the current authenticated user via `supabase.auth.getUser()`
   - Calls `supabase.functions.invoke('create-checkout')` with no body (uses the default price ID already mapped in the edge function)
   - On success: opens the returned `url` in a new tab
   - On error: shows a `toast.error()` with the message
   - Shows a loading spinner while in flight

2. **Test card helper text** below the button:
   - Small muted text: `Test card: 4242 4242 4242 4242 · any future date · any CVC` with a copy button that copies the card number

### Files changed

- `src/components/admin/AdminStripeTab.tsx` — add button + helper inside the existing blue info card at the top

### No other changes needed
- The `create-checkout` edge function already handles authenticated users, defaults to the mapped price, and includes `internal_user_id` in metadata
- Access is only granted by webhook, not by redirect
- This tab is already CEO/operator-gated

