

## Fix: ResetPassword.tsx stuck on "Verifying" spinner

**Root cause confirmed**: The `PASSWORD_RECOVERY` event fires before the component mounts (caught by `AuthProvider` instead). The URL hash is cleared by Supabase after token exchange. So both the event listener and hash fallback fail.

**Single-file fix in `src/pages/ResetPassword.tsx`**:

Remove the hash-dependent checks and replace with a simple session check — if the user has an active session on `/reset-password`, they got here via a recovery link, so show the form immediately.

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setReady(true);
    }
  });

  // Fallback: session already exists (token consumed during redirect)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setReady(true);
  });

  return () => subscription.unsubscribe();
}, []);
```

This removes the unreliable `hash.includes("type=recovery")` checks and treats any active session on this page as a valid recovery redirect.

No other files need changes — the edge function and Auth.tsx are already correct from the previous fix.

