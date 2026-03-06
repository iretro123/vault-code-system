

## Fix: Password Reset Redirects to `/auth#` Instead of Reset Form

### Root Cause
When the GHL edge function calls `admin.generateLink({ type: "recovery" })`, Lovable Cloud's email hook **also** fires and sends a **second** recovery email through the standard system. That email contains the old-style `/verify` link. When users click it, Supabase verifies the token and does a 303 redirect to `/auth#` (because the custom domain isn't in the allowed redirect list). The user lands on the login page with recovery tokens buried in the URL hash — but nothing picks them up.

The GHL email has the correct direct link, but users are clicking the **other** email that arrives from the system.

### Fix (Two Parts)

#### 1. Global Recovery Detection (`src/hooks/useAuth.tsx`)
In the `onAuthStateChange` listener, detect the `PASSWORD_RECOVERY` event and redirect to `/reset-password`. This catches the case where users click the standard Supabase email and land on `/auth#` with recovery tokens in the hash.

```ts
if (event === "PASSWORD_RECOVERY") {
  window.location.href = "/reset-password";
  return;
}
```

This is the safety net — no matter which page the recovery redirect lands on, the user gets sent to the reset form.

#### 2. Auth Page Hash Detection (`src/pages/Auth.tsx`)
As a backup, check `window.location.hash` on mount. If it contains `type=recovery`, immediately redirect to `/reset-password` (preserving the hash so the reset page can consume the tokens).

```ts
useEffect(() => {
  if (window.location.hash.includes("type=recovery")) {
    window.location.href = "/reset-password" + window.location.hash;
  }
}, []);
```

### Files to Change
1. `src/hooks/useAuth.tsx` — add `PASSWORD_RECOVERY` redirect in `onAuthStateChange`
2. `src/pages/Auth.tsx` — add hash detection on mount to redirect to reset page

