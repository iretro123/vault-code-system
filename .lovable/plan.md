

## Fix: "Welcome to Vault Academy" Onboarding Showing on Every Login

### Root Cause
43 out of 46 users have `profile_completed = false` in the database. The `AcademyLayout` checks this field (line 119) and shows the full 8-step onboarding flow whenever it's `false`. Since these are existing users who signed up before the onboarding was added, they get hit with it every time they log in.

### Fix

**1. Database migration — backfill existing users**
- Run `UPDATE profiles SET profile_completed = true WHERE profile_completed = false`
- All 43 existing users immediately stop seeing the onboarding gate

**2. Guard logic improvement in `AcademyLayout.tsx`**
- Add a secondary check: if the user has `onboarding_completed = true` OR has been active (has posted messages, completed lessons, etc.), treat them as profile-completed even if the flag is somehow `false`
- This prevents future regressions where older accounts get trapped in onboarding

### Files Changed
- `src/components/layout/AcademyLayout.tsx` — add fallback check
- Migration SQL — backfill `profile_completed = true` for all existing users

