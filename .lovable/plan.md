

## Fix: Onboarding Stuck After Activation

### Problems
1. `FORCE_ONBOARDING_PREVIEW = true` on line 119 means onboarding ALWAYS shows, even after completing it — `refetchProfile()` refreshes the profile but the hardcoded flag overrides the check
2. No X/close button on the activation screen, so users are trapped

### Fix

**`src/components/layout/AcademyLayout.tsx`**
- Remove `FORCE_ONBOARDING_PREVIEW = true` entirely (lines 118-119)
- Keep only the `?preview-onboarding` query param check for future admin testing
- Final gate: `if (searchParams.has("preview-onboarding") || !(profile as any)?.profile_completed)`

**`src/components/onboarding/AppOnboarding.tsx`**
- Add a small X close button (top-right corner) visible on the final "Your Vault is Ready" screen so users can manually dismiss if auto-advance fails
- On the activated screen, reduce the auto-advance timeout and add a "Go to Dashboard" button as fallback after 2 seconds
- When in preview mode (detect via URL param), skip the DB update and just show the flow — then closing/finishing navigates back to dashboard without modifying profile

### Files Changed
- `src/components/layout/AcademyLayout.tsx`
- `src/components/onboarding/AppOnboarding.tsx`

