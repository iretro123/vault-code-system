

## Re-test GHL SMS Delivery

Now that you've added credits to GHL, I'll re-invoke the `ghl-password-reset` function for `test@vault.dev` to send the SMS to +17273327136 again. I'll also fix the email payload (use `html` instead of `message`) in the same pass.

### Changes

**1. Fix `supabase/functions/ghl-password-reset/index.ts`**
- Change the email send call from `message` to `html` field (fixes the 422 error)
- Keep SMS logic as-is (it was accepted before, just no credits)

**2. Re-invoke the function**
- Call `ghl-password-reset` with `{ "email": "test@vault.dev" }` to trigger both SMS and email

