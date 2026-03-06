

## Remove "Start Here" page and fix dashboard not loading

### Root cause of dashboard not loading
In `AcademyHome.tsx` (lines 116-123), there's a redirect: if `profile.academy_experience === "newbie"` and `!profile.onboarding_completed`, users get sent to `/academy/start` instead of seeing the dashboard. Since we're removing the Start page, this creates a redirect loop or dead end.

### Changes

**1. `src/App.tsx`**
- Remove the `AcademyStart` import (line 23)
- Remove the `/academy/start` route (line 83)
- Add a redirect: `<Route path="start" element={<Navigate to="home" replace />} />` so any old links still work

**2. `src/pages/academy/AcademyHome.tsx`**
- Remove the `isFirstVisit` check and `Navigate to /academy/start` block (lines 116-123) — always show the dashboard
- The `ClaimRoleModal` already exists on the dashboard (line 162) for onboarding, so role claiming still works

**3. `src/components/layout/AcademySidebar.tsx`**
- Remove the "Start" sidebar item block (lines 164-177) that shows when `!onboardingComplete`

**4. References cleanup** — update `/academy/start` references to `/academy/home`:
- `src/components/academy/OnboardingProgressCard.tsx` line 15
- `src/lib/getNextStep.ts` line 25
- `src/components/settings/SettingsHelp.tsx` line 22
- `src/components/academy/NextMoveCard.tsx` line 18
- `src/components/academy/dashboard/GameplanCard.tsx` line 62

All references will point to `/academy/home` instead, keeping the onboarding prompts functional but within the dashboard itself.

