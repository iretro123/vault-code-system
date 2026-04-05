

## Temporary Admin Preview of Onboarding

Add a `?preview-onboarding` query parameter check in `AcademyLayout.tsx` so you can view the full onboarding flow on your existing account without affecting any data.

**`src/components/layout/AcademyLayout.tsx`**
- Before the `profile_completed` check, add: if `searchParams.has("preview-onboarding")`, render `<AppOnboarding />` regardless of profile status
- The activation step in preview mode will still work normally — it just won't change anything since your profile is already completed

**How to use**: Navigate to `/academy/home?preview-onboarding` in the preview. Remove the param to go back to normal.

### Files Changed
- `src/components/layout/AcademyLayout.tsx`

