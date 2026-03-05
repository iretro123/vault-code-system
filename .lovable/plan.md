

## Plan: Integrate GoHighLevel for Password Reset SMS + Email

### How It Works

When a user clicks "Forgot Password," the app will:
1. Look up their phone number and email from the `profiles` table
2. Generate the standard auth reset link (via the existing auth flow)
3. Call a new edge function that sends the reset link via GHL SMS and/or email using their Conversations API

### Prerequisites — API Secrets

You'll need two secrets stored:
- **GHL_API_KEY** — Your GoHighLevel Private Integration API key
- **GHL_LOCATION_ID** — The Location ID for "Vault Trade Academy" (found in GHL Settings → Business Profile or the URL)

I'll use the `add_secret` tool to prompt you for these before writing code.

### Changes

**1. New edge function: `supabase/functions/ghl-password-reset/index.ts`**
- Accepts `{ email }` in the request body
- Uses service role to look up the user's `phone_number` from `profiles`
- Generates a password reset link via Supabase Admin Auth (`generateLink`)
- Calls GHL API v2 to:
  - Find or create the contact by email (`POST /contacts/upsert`)
  - Send an SMS via Conversations API (`POST /conversations/messages`) with the reset link
  - Send an email via Conversations API with the reset link
- Returns success/failure status

**2. Update `src/pages/Auth.tsx` — `handleForgotPassword`**
- After the existing `resetPasswordForEmail` call succeeds, also call the `ghl-password-reset` edge function to send the SMS + email via GHL
- The standard auth email still sends as a fallback; GHL is additive

**3. Update `supabase/config.toml`** — add `[functions.ghl-password-reset]` with `verify_jwt = false` (public endpoint, no auth needed since it only accepts an email and rate-limits internally)

### GHL API Calls Used

```text
POST /contacts/upsert          → Find/create contact by email
POST /conversations/messages   → Send SMS (type: "SMS") with reset link
POST /conversations/messages   → Send email (type: "Email") with reset link
```

All calls go to `https://services.leadconnectorhq.com` with headers:
- `Authorization: Bearer {GHL_API_KEY}`
- `Version: 2021-07-28`

### Scopes Required (confirmed from your screenshot)
- `conversations/message.write` — send messages
- `contacts.write` — upsert contact
- `contacts.readonly` — look up contact

These match what you've already configured.

### Files
1. `supabase/functions/ghl-password-reset/index.ts` — new edge function
2. `src/pages/Auth.tsx` — call the new function after reset email sends
3. `supabase/config.toml` — register the function (no JWT)

