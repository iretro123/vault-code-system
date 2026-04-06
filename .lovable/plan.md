
Root cause is real: the onboarding screen is still rendering during the login transition, and the clip/session replay confirms the full-screen “Welcome to Vault Academy / Let’s Set Up Your Vault” overlay appears right after sign-in before the app settles.

What I found:
- `AcademyLayout.tsx` still gates on:
  - `!profile_completed && !onboarding_completed`
- `AppOnboarding.tsx` only writes `profile_completed: true`
- It does not write `onboarding_completed: true`
- `AcademyDataContext` keeps `hydrated` sticky once true and does not reset when auth/user changes
- `useAuth` seeds `profile` from local cache immediately, then fetches fresh profile later
- Session replay shows the onboarding overlay mounting right after sign-in, which means the layout is evaluating the user as “new” during that transition window

Why it still happens:
1. Existing accounts can still have stale/incomplete profile flags during the auth handoff.
2. New onboarding completion only sets `profile_completed`, but the layout uses two flags.
3. `AcademyLayout` makes the gating decision as soon as auth loading ends, before all academy state is safely re-synced for the active user.
4. `hydrated` not resetting on user change makes the layout easier to enter with mixed old/new state.

Plan to fix:
1. Make onboarding completion fully explicit
- In `AppOnboarding.tsx`, save both:
  - `profile_completed = true`
  - `onboarding_completed = true`
- Keep the onboarding state upsert too

2. Harden the Academy gate
- In `AcademyLayout.tsx`, replace the current gate with a stricter “ready-to-decide” check:
  - do not evaluate onboarding until user/profile are fully available for the current session
  - treat users as completed if either completion flag is true
- Only show `AppOnboarding` when the current user profile is definitively loaded and both flags are false

3. Reset academy hydration when auth user changes
- In `AcademyDataContext.tsx`, reset `hydrated` to `false` whenever auth is changing or a different user logs in/out
- This prevents the main academy layout from reusing stale hydrated state across sessions

4. Reduce stale cached-profile flashes
- In `useAuth.tsx`, improve the auth transition behavior so cached profile data does not briefly drive the wrong gate after login/logout
- Keep loading true until the current user’s profile fetch resolves, instead of letting the route decide too early

5. Keep Trade OS reset behavior intact
- The trade reset flows intentionally use `onboarding_completed = false`
- We’ll preserve that behavior, but make sure Academy onboarding and Trade OS onboarding remain clearly separated and don’t accidentally trigger each other

Files to update:
- `src/components/layout/AcademyLayout.tsx`
- `src/components/onboarding/AppOnboarding.tsx`
- `src/contexts/AcademyDataContext.tsx`
- `src/hooks/useAuth.tsx`

Technical notes:
- The issue is not just bad database data anymore; it is now a state-timing problem during login.
- The safest logic is:
```text
if auth/profile not ready -> show loading shell
else if preview mode -> show onboarding
else if profile_completed || onboarding_completed -> enter academy
else -> show onboarding
```
- This also aligns better with your desired behavior: onboarding should appear once, only for truly new users.

Bonus cleanup I’d include while in there:
- Fix the React warning in console:
  - “Function components cannot be given refs”
- That warning is unrelated to the welcome bug, but worth cleaning since it can mask real console issues during testing

Verification after implementation:
1. Sign out completely
2. Sign back in with an existing account
3. Confirm no onboarding overlay appears even for a split second
4. Test hard refresh on `/academy/home`
5. Test a truly new account and confirm onboarding still appears once
6. Complete onboarding and confirm it never reappears on next login
