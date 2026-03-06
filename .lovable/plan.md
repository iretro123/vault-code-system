

## Fix: Persist Role Claim Everywhere + Show Experience Badge

### Problems Found
1. **ClaimRoleModal** saves `role_level` but not `academy_experience` — they drift apart
2. **ClaimRoleModal** clears localStorage but never triggers `useAuth` to refetch the profile state — UI stays stale until page reload
3. **PlayerIdentity** (top-right avatar) shows leadership badges (CEO/Admin/Coach) but has NO experience badge for regular members (Beginner/Intermediate/Advanced)
4. **Chat profile cache** (`useChatProfiles`) is write-once — after claiming a role, stale data persists until full reload
5. **Profile settings** (`AcademyProfileForm`) already shows/saves `role_level` correctly — no changes needed there

### Changes

**1. `src/components/academy/ClaimRoleModal.tsx`**
- Also update `academy_experience` alongside `role_level` so both fields stay in sync
- After saving, call `window.location.reload()` (simple, guarantees all caches refresh) — OR add a `refetchProfile` to `useAuth`. The reload approach is simpler and the modal already has a 1.5s success animation delay.

**2. `src/hooks/useAuth.tsx`**
- Export a `refetchProfile()` function that re-runs `fetchUserData` so components can trigger a profile refresh without a full page reload

**3. `src/components/academy/ClaimRoleModal.tsx` (revised)**
- Call `refetchProfile()` from useAuth after saving instead of reload, for a smoother UX

**4. `src/components/layout/PlayerIdentity.tsx`**
- Import `ExperienceLevelBadge` (new small component) and show it next to the name for non-leadership users (same logic as chat: skip if CEO/Admin/Coach)

**5. `src/components/academy/ExperienceLevelBadge.tsx` (new file)**
- Small reusable badge component for Beginner/Intermediate/Advanced with the same color scheme as the chat `ExperienceBadge` in RoomChat
- Accepts `level: string` prop

**6. `src/hooks/useChatProfiles.ts`**
- Export a `invalidateProfile(userId)` function that removes a user from `globalFetchedIds` so the next render refetches their data
- Call this from ClaimRoleModal after save

### Flow After Fix
1. User clicks "Lock In" as Intermediate
2. `profiles.role_level` AND `profiles.academy_experience` both set to `"intermediate"`
3. `useAuth.refetchProfile()` called — profile state updates in React
4. `useChatProfiles.invalidateProfile(userId)` called — chat cache cleared for self
5. PlayerIdentity immediately shows "Intermediate" badge
6. Chat messages show updated "Intermediate" badge on next load
7. Profile Settings page reflects the correct level (already works)

### Summary
- 1 new file (`ExperienceLevelBadge.tsx`)
- 4 files edited (`ClaimRoleModal`, `useAuth`, `PlayerIdentity`, `useChatProfiles`)
- No database changes needed (columns exist)

