

## Inline Profile Editing from Profile Card

### Problem
The pencil icon on UserProfileCard navigates to `/academy/settings`, which loads `SettingsProfile` — a component that has NO banner, bio, or social link editing. The full profile form (`AcademyProfileForm`) lives on `/academy/profile` but isn't accessible from the card. Users have no way to edit their banner, bio, or socials from the profile popover.

### Solution
Add an **inline edit mode** directly inside `UserProfileCard`. When the user clicks the pencil icon, the card expands into an edit form (banner, avatar, bio, socials) — no navigation away. Changes save to DB and sync the card immediately.

### File Changes

**1. `src/components/academy/community/UserProfileCard.tsx`**
- Add `editMode` state toggle (pencil icon flips card to edit mode, X flips back)
- In edit mode, render:
  - Banner: clickable overlay with upload button + clear button (reuse same upload logic from AcademyProfileForm)
  - Bio: editable textarea (max 160 chars)
  - Social links: 4 compact inputs (Twitter, Instagram, TikTok, YouTube)
  - Save button at bottom
- On save: update `profiles` table with new values, clear the `usePublicProfile` cache for this user, flip back to view mode
- Card width stays ~300px, scrolls internally if needed
- Keep the premium solid dark styling

**2. `src/hooks/usePublicProfile.ts`**
- Export a `clearProfileCache(userId)` function so the card can invalidate the cache after saving
- After save, refetch and update the displayed profile

### What stays the same
- View mode layout unchanged
- Privacy model unchanged
- Non-own-profile cards unchanged
- The settings page profile form still works independently

### Technical Details
- Banner upload reuses the same `avatars` bucket + crop logic already in `AcademyProfileForm`
- Save does a single `supabase.from('profiles').update(...)` call
- No new DB changes needed — all columns already exist

