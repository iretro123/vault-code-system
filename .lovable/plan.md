

## Problem

The password reset flow is broken because:
1. The `redirectTo` in `Auth.tsx` points to `/auth` — so the recovery link lands on the login page
2. There is **no `/reset-password` route or page** in the app to handle the recovery token and let the user set a new password

The auth logs confirm this: `"One-time token not found"` and `"Email link is invalid or has expired"` because the token gets consumed on redirect but no password update form is shown.

## Plan

### 1. Create `src/pages/ResetPassword.tsx`
A dedicated page that:
- Detects the `type=recovery` event from the URL hash via `onAuthStateChange`
- Shows a "Set New Password" form (new password + confirm)
- Calls `supabase.auth.updateUser({ password })` on submit
- Shows success message and redirects to `/auth` after update

### 2. Add route in `src/App.tsx`
- Add `<Route path="/reset-password" element={<ResetPassword />} />` (public, no auth gate)

### 3. Update `redirectTo` in `Auth.tsx`
- Change line 66 from `redirectTo: \`\${window.location.origin}/auth\`` to `redirectTo: \`\${window.location.origin}/reset-password\``

### 4. Update `redirectTo` in `SettingsSecurity.tsx`
- Change the `redirectTo` in `handleResetPassword` from `window.location.origin` to `window.location.origin + '/reset-password'`

### 5. Update `redirectTo` in `ghl-password-reset` edge function
- Ensure the generated reset link also points to `/reset-password`

