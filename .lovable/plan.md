

## Plan: Username Lock, Phone Required, and Admin Export Updates

### Changes Overview

**4 files to modify:**

1. **`src/pages/Auth.tsx`** — Add phone number + username fields to the signup form. Username gets real-time uniqueness check. Phone is required to submit. Username is auto-generated as default but user can pick their own.

2. **`src/components/settings/SettingsProfile.tsx`** — Make username field read-only (disabled input with lock icon and helper text "Username cannot be changed after registration"). Phone number remains editable.

3. **`src/lib/ensureProfile.ts`** — Accept optional `phone_number` and `username` params so the signup flow can pass them through when creating the profile.

4. **`src/pages/academy/AcademyAdminUsers.tsx`** — Add `username` column to CSV export. Already shows username in the table, just missing from the export data.

### Implementation Details

**Auth.tsx (Signup Form)**
- Add `username` and `phoneNumber` state fields, shown only in signup mode
- Username input with debounced uniqueness check against `profiles` table (query by username, show inline error "Username taken" or green check)
- Phone number input marked required — form won't submit without it
- Pass username + phone to `ensureProfile()` after successful signup

**SettingsProfile.tsx**
- Change username `<Input>` to `disabled` with `opacity-60 cursor-not-allowed` styling
- Remove the username uniqueness check from `handleSave` (no longer needed since it can't change)
- Remove `username` from the `.update()` call
- Update label from "Username (optional)" to "Username" with helper "Set during registration. Cannot be changed."

**ensureProfile.ts**
- Add optional `username` and `phone_number` parameters
- Use provided username if given, otherwise fall back to `trader_<shortid>` default

**AcademyAdminUsers.tsx**
- Add "Username" to the CSV export header and rows (already in the table view, just missing from export)

