

## Test GHL Password Reset SMS

### Problem
The `test@vault.dev` profile has **no phone number stored** (`phone_number: null`). The GHL function only sends SMS when a phone number exists. We need to fix that first, then test.

### Steps

**1. Update profile phone number**
Run a migration to set the phone number on the test account:
```sql
UPDATE profiles SET phone_number = '+17273327136' SET WHERE email = 'test@vault.dev';
```
Phone must be in E.164 format (`+1` prefix) for GHL to accept it.

**2. Test the edge function**
Call `ghl-password-reset` with `{ "email": "test@vault.dev" }` to trigger:
- GHL contact upsert with phone + email
- SMS to +17273327136 with password reset link
- Email to test@vault.dev with the same link

**3. Verify via edge function logs**
Check logs for `[GHL] SMS sent: true` and `[GHL] Email sent: true` confirmations.

### What This Proves
- The GHL API key and location ID are configured correctly
- Contact upsert works
- SMS delivery works to your phone
- Email delivery works through GHL conversations API

