

## Bulletproof Onboarding for All New Users

### Current Status
The root cause (writing `first_name`/`last_name` to non-existent columns) is already fixed. The update payload now only uses valid columns. However, two failure modes remain that could still trap users:

### Remaining Issues

**1. Silent failure — no user feedback**
If `handleActivate` fails (network error, RLS issue, any DB problem), the catch block on line 192 only does `console.error`. The user sees the spinner stop but gets no error message and no way to retry. They're stuck on "Activate My Vault" with no indication anything went wrong.

**2. "Access Dashboard" button can dead-end**
After activation succeeds, the "Go to Dashboard" button calls `handleDismiss` → `refetchProfile()`. This just re-fetches the profile and relies on `AcademyLayout` to detect `profile_completed = true` and swap out the onboarding screen. If the refetch fails or is slow, nothing happens — the button appears broken.

### Fix

**File: `src/components/onboarding/AppOnboarding.tsx`**

1. Add a visible error toast in the catch block so users know activation failed and can retry
2. Add a fallback in `handleDismiss`: if `refetchProfile` doesn't navigate away within 2 seconds, force-navigate to `/academy` with a page reload as a safety net
3. Add a loading state to the "Go to Dashboard" button so it doesn't feel broken during the refetch

### Technical Detail

```ts
// In catch block (line 192):
catch (e) {
  console.error("Onboarding activation failed:", e);
  toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
}

// In handleDismiss — add timeout fallback:
const handleDismiss = useCallback(async () => {
  if (isPreview) { /* existing preview logic */ return; }
  setDismissing(true);
  await refetchProfile();
  // Safety net: if still on onboarding after 2s, force reload
  setTimeout(() => {
    window.location.href = "/academy";
  }, 2000);
}, [isPreview, refetchProfile]);
```

| File | Change |
|------|--------|
| `src/components/onboarding/AppOnboarding.tsx` | Add error toast on activation failure, add loading + fallback navigation on "Go to Dashboard" |

