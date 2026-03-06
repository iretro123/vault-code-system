

## Redesign Signup Page — Reference Style + Required Username + Name Fields

Pure visual redesign of `src/pages/Signup.tsx`. All existing logic (Stripe check, username check, referral, provisioning, ensureProfile) stays untouched.

### Changes to `src/pages/Signup.tsx`

**New state:**
- `firstName`, `lastName`, `confirmPassword` strings

**Field order (matching approved plan):**
1. First Name / Last Name (side-by-side row, both required)
2. Username (required, remove "(optional)", add red asterisk)
3. Email (keep Stripe membership check as-is)
4. Phone Number (required, keep as-is)
5. Password
6. Confirm Password (client-side match check)
7. Create Account button

**Style changes:**
- Remove `<Card>` wrapper — form floats on dark background
- Remove back arrow header
- Keep Shield icon + "VAULT OS" title, subtitle "Join Vault Academy today"
- Widen to `max-w-md`
- Input styling: `bg-white/5 border-white/10 h-12 rounded-lg` (dark transparent look from reference)
- Labels: `text-sm font-medium text-white/80`
- Button: keep existing blue gradient style
- "Already have an account?" link stays at bottom

**Validation update:**
- `fieldsValid` adds: `firstName.trim() !== "" && lastName.trim() !== "" && username.trim().length >= 3 && password === confirmPassword`
- `handleSubmit` adds: confirm password mismatch toast, username required toast
- Pass `display_name: \`${firstName.trim()} ${lastName.trim()}\`` to `ensureProfile`

**ensureProfile call update:**
```ts
await ensureProfile(newUserId, email, {
  phone_number: phoneNumber.trim(),
  username: username.trim().toLowerCase(),
  display_name: `${firstName.trim()} ${lastName.trim()}`,
});
```

**`src/lib/ensureProfile.ts`** — add `display_name` to opts type and use it instead of email prefix default when provided.

**Files:** `src/pages/Signup.tsx`, `src/lib/ensureProfile.ts` (minor opts addition). No database changes.

