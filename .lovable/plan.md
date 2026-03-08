

## Redesign Login Page (FX Replay Style)

Matching the reference screenshot's layout and feel while keeping all existing login logic untouched.

### Design Changes (Auth.tsx only)

1. **Logo**: Replace Shield icon + "VAULT OS" text with a styled `VAULT` (white) + `OS` (blue) wordmark, large and bold
2. **Layout**: Match the reference — centered card with dark surface, inputs with left icons (@ for email, lock for password), password toggle eye icon
3. **"First time here?" link** above form instead of below
4. **Inputs**: Add left-side icons (AtSign, Lock), add eye toggle for password visibility
5. **"Forgot password?"** link right-aligned below password field (not inline with label)
6. **Sign In button**: Full-width blue pill with arrow icon, matching the reference
7. **No Google button** (already not present, confirmed)
8. **Font**: Already using Inter/system-ui which matches the reference's clean sans-serif

### What stays the same
- All `handleSubmit`, `handleForgotPassword`, `signIn` logic — zero changes
- All state management, toast messages, navigation
- Recovery token redirect
- Banned/revoked user check
- Forgot password mode with reset sent/error states

### File: `src/pages/Auth.tsx`
Pure visual restructure of the JSX return. No logic changes.

