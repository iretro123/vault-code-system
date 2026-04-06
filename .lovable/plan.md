

## Required Avatar During Onboarding + Backfill Existing Users

### What we're doing
1. Add a new **"Choose Your Avatar" step** in the onboarding flow (AppOnboarding.tsx) so every new user MUST pick an avatar before activating their vault
2. **Backfill existing users** who have no avatar_url set — assign them a random icon-based avatar from the existing icon library
3. Save the chosen avatar to the profile on activation

### Changes

**`src/components/onboarding/AppOnboarding.tsx`** — Add avatar step between Identity (step 1) and Experience (step 2):
- Add new step (becomes step 2, bumping everything else up by 1 — total steps become 0-7)
- Show a grid of the existing `AVATAR_ICONS` (from `avatarIcons.tsx`) with color picker using `AVATAR_COLORS`
- Also show an "Upload Photo" option using the same crop-to-square + storage upload logic from `AcademyProfileForm`
- User must select at least an icon OR upload a photo to continue — Continue button disabled until avatar is set
- Store chosen avatar as `avatarUrl` state, save it in `handleActivate` as `avatar_url` in the profile update
- Update `OnboardingProgressBar` total from 6 to 7 steps
- Add avatar preview in the summary step

**`src/lib/ensureProfile.ts`** — Auto-assign random avatar on profile creation:
- When inserting a new profile, generate a random avatar_url using format `icon:{randomIcon}|{randomColor}` from the AVATAR_ICONS and AVATAR_COLORS arrays
- This ensures even if onboarding is somehow skipped, the user has a visible avatar

**Migration** — Backfill existing profiles with no avatar:
- Run an UPDATE on `profiles` where `avatar_url IS NULL OR avatar_url = ''` 
- Use a SQL function to assign random icon avatars: pick a random icon ID from a predefined list and a random HSL color
- This is a one-time data fix for all existing users without avatars

### Files Changed
- `src/components/onboarding/AppOnboarding.tsx` — new avatar selection step
- `src/lib/ensureProfile.ts` — random default avatar on profile creation
- Migration SQL — backfill existing users with random icon avatars

