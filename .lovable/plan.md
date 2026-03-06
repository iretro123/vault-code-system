

## Fix Password Reset: Bypass Supabase Redirect Entirely

### Root Cause
The `generateLink` API produces a link like `https://<supabase-url>/auth/v1/verify?token=...&redirect_to=https://member.vaulttradingacademy.com/reset-password`. When clicked, Supabase verifies the token and does a 303 redirect to `redirect_to`. **But `redirect_to` must be in the allowed redirect URLs list.** Since the custom domain `member.vaulttradingacademy.com` likely isn't registered there, Supabase silently falls back to the default site URL — landing users on the root page with an active session (implicit login), never showing the reset form.

The auth logs confirm this: every recovery request results in a `login` via `/verify` with status 303 and `login_method: "implicit"` — meaning users are logged in and redirected away, never reaching `/reset-password`.

### Solution: Skip Supabase's redirect entirely
Instead of sending users to Supabase's `/verify` endpoint (which handles the redirect), we extract the `hashed_token` from `generateLink` and construct a direct link to our own `/reset-password` page. The reset page then calls `supabase.auth.verifyOtp()` to exchange the token for a session client-side.

### Changes

#### 1. Edge Function (`supabase/functions/ghl-password-reset/index.ts`)
After `generateLink`, extract the `hashed_token` from the response instead of using `action_link`:

```ts
const hashedToken = linkData.properties.hashed_token;
const resetLink = `${redirectTo}?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
```

This creates a link like `https://member.vaulttradingacademy.com/reset-password?token_hash=abc123&type=recovery` — no Supabase redirect involved.

#### 2. Reset Password Page (`src/pages/ResetPassword.tsx`)
Replace the `useEffect` to read `token_hash` and `type` from the URL query params, then call `verifyOtp` to establish the session:

```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (tokenHash && type === "recovery") {
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      .then(({ error }) => {
        if (error) {
          setError("Reset link is invalid or expired. Please request a new one.");
        } else {
          setReady(true);
        }
      });
    return;
  }

  // Fallback: check hash fragment (legacy links)
  const hash = window.location.hash;
  if (hash.includes("type=recovery")) {
    setReady(true);
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") setReady(true);
  });

  return () => subscription.unsubscribe();
}, []);
```

#### 3. Prevent AuthProvider from interfering
No change needed — `AuthProvider` doesn't redirect on login. The `/reset-password` route is public and not wrapped in any auth gate, so the session established by `verifyOtp` won't cause a redirect.

### Files to change
1. `supabase/functions/ghl-password-reset/index.ts` — use `hashed_token` instead of `action_link`
2. `src/pages/ResetPassword.tsx` — read query params, call `verifyOtp`, keep hash fallback

