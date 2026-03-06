

## Fix Password Reset: Add SMS + Fix Redirect Issue

Two problems identified:

### Problem 1: No SMS on password reset
`SettingsSecurity.tsx` calls `supabase.auth.resetPasswordForEmail()` directly, bypassing the `ghl-password-reset` edge function that sends both SMS and email.

**Fix in `src/components/settings/SettingsSecurity.tsx`:**
Replace the `handleResetPassword` function to call the `ghl-password-reset` edge function instead:
```ts
const handleResetPassword = async () => {
  if (!user?.email) return;
  const { error } = await supabase.functions.invoke("ghl-password-reset", {
    body: { email: user.email, origin: window.location.origin },
  });
  if (error) { toast.error("Failed to send reset link."); return; }
  toast.success("Password reset link sent via email and text.");
};
```

### Problem 2: Reset page redirects to login instead of showing the form
The `ResetPassword.tsx` page relies on the `PASSWORD_RECOVERY` auth state event, but this event can fire before the component mounts (race condition). The fallback `getSession()` check works, but the page doesn't detect the recovery context from the URL hash.

**Fix in `src/pages/ResetPassword.tsx`:**
Add URL hash parsing to detect `type=recovery` directly from the redirect URL fragments. This handles the case where the auth state event fires before the listener is attached:

```ts
useEffect(() => {
  // Check URL hash for recovery token (most reliable)
  const hash = window.location.hash;
  if (hash.includes("type=recovery")) {
    setReady(true);
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") setReady(true);
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setReady(true);
  });

  return () => subscription.unsubscribe();
}, []);
```

### Files to change
1. `src/components/settings/SettingsSecurity.tsx` — use GHL edge function
2. `src/pages/ResetPassword.tsx` — add URL hash detection

