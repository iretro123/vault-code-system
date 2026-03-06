

## Remove Hub / "Select Mode" screen — go straight to Academy

### Change

**File: `src/App.tsx`**

1. Remove the `/hub` route and the `Hub` import
2. Change the `/` redirect from `/hub` to `/academy`
3. Update any other references that navigate to `/hub` to go to `/academy` instead

**File: `src/components/layout/PlayerIdentity.tsx`**

- Change the "Mode Select" dropdown link from `/hub` to `/academy/home`
- Optionally remove the "Mode Select" item entirely since there's only one mode

**File: `src/components/layout/AcademyLayout.tsx`**

- Change the "Back to Hub" mobile button to navigate to `/academy/home` (or remove it)
- Change the revoked-access "Back to Hub" link to `/auth`

**File: `src/components/academy/RoomChat.tsx` or any other files** referencing `/hub` — update to `/academy`.

No database changes needed. ~5 files, small edits each.

